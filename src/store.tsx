import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from './types';
import {
  connectCloud,
  claudeRuntime,
  diffDocs,
  fromDocs,
  isDirectChild,
  privateCollection,
  PROFILE_PATH,
  SHARED_COLLECTIONS,
  toDocs,
  Writer,
  type DocMap,
} from './lib/cloudSync';

const STORAGE_KEY = 'futari-note:v1';

export function createEmptyData(): AppData {
  return {
    version: 1,
    profile: { myName: '', partnerName: '', startDate: '' },
    settings: {
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      sharedCalendarId: '',
    },
    todos: [],
    anniversaries: [],
    celebrations: [],
    vlogs: [],
    events: [],
  };
}

/** 保存データを読み込み、欠けているフィールドを既定値で補う */
export function normalizeData(raw: unknown): AppData {
  const empty = createEmptyData();
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Partial<AppData>;
  const arr = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  return {
    version: 1,
    profile: { ...empty.profile, ...r.profile },
    settings: { ...empty.settings, ...r.settings },
    todos: arr(r.todos),
    anniversaries: arr(r.anniversaries),
    celebrations: arr(r.celebrations),
    vlogs: arr(r.vlogs),
    events: arr(r.events),
  };
}

function load(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? normalizeData(JSON.parse(s)) : createEmptyData();
  } catch {
    return createEmptyData();
  }
}

function saveLocal(d: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // 容量超過・ストレージ無効などは無視（データはメモリ上に残る）
  }
}

/**
 * local: この端末のブラウザに保存
 * connecting: クラウドに接続中
 * cloud: claude.ai 上で二人の間で共有
 */
export type SyncMode = 'local' | 'connecting' | 'cloud';

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replaceAll: (d: AppData) => void;
  mode: SyncMode;
  /** 自分専用（サプライズ）の保存領域が使えるか */
  hasPrivate: boolean;
  syncError: string;
  readOnly: boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // 端末ごとの設定（と local モードの全データ）
  const [local, setLocal] = useState<AppData>(load);
  const [mode, setMode] = useState<SyncMode>(() => (claudeRuntime() ? 'connecting' : 'local'));
  const [docs, setDocs] = useState<DocMap>({});
  const [uid, setUid] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const docsRef = useRef(docs);
  const writerRef = useRef<Writer | null>(null);
  docsRef.current = docs;

  useEffect(() => saveLocal(local), [local]);

  // claude.ai 上で開かれていればクラウド同期を開始
  useEffect(() => {
    if (!claudeRuntime()) return;
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    connectCloud()
      .then((conn) => {
        if (cancelled) return;
        if (!conn) {
          setMode('local');
          return;
        }
        const { db, uid } = conn;
        setUid(uid);
        const writer = new Writer(
          db,
          (e) => {
            if (e.code === 'invalid_argument') {
              setReadOnly(true);
              setSyncError('このページを編集する権限がありません（閲覧のみ）');
            } else if (e.code === 'quota_exceeded') {
              setSyncError('保存できる件数の上限に達しました。古いデータを削除してください');
            } else {
              setSyncError(`保存に失敗しました: ${e.message ?? e.code ?? ''}`);
            }
          },
          () => {},
        );
        writerRef.current = writer;

        // 書き込み待ちのドキュメントは手元の値を優先する
        const applyCollection = (collection: string, snapDocs: { id: string; data(): Record<string, unknown> | undefined }[]) =>
          setDocs((prev) => {
            const next: DocMap = {};
            for (const [p, b] of Object.entries(prev)) {
              if (!isDirectChild(p, collection) || writer.isPending(p)) next[p] = b;
            }
            for (const s of snapDocs) {
              const p = `${collection}/${s.id}`;
              const body = s.data();
              if (body && !writer.isPending(p)) next[p] = body;
            }
            return next;
          });

        const onErr = (e: { code: string; message: string }) => {
          if (e.code !== 'revoked') setSyncError(`同期エラー: ${e.message}`);
        };
        for (const col of SHARED_COLLECTIONS) {
          unsubs.push(db.collection(col).onSnapshot((s) => applyCollection(col, s.docs), onErr));
        }
        if (uid) {
          const pc = privateCollection(uid);
          unsubs.push(db.collection(pc).onSnapshot((s) => applyCollection(pc, s.docs), onErr));
        }
        unsubs.push(
          db.doc(PROFILE_PATH).onSnapshot((s) => {
            if (writer.isPending(PROFILE_PATH)) return;
            const body = s.data();
            setDocs((prev) => {
              const next = { ...prev };
              if (body) next[PROFILE_PATH] = body;
              else delete next[PROFILE_PATH];
              return next;
            });
          }, onErr),
        );
        setMode('cloud');
      })
      .catch(() => !cancelled && setMode('local'));
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  const data = useMemo(() => (mode === 'local' ? local : fromDocs(docs, local, uid)), [mode, local, docs, uid]);
  const dataRef = useRef(data);
  dataRef.current = data;

  const commit = useCallback(
    (next: AppData) => {
      // 設定は常に端末ごと
      if (mode === 'local') {
        setLocal(next);
        return;
      }
      setLocal((l) => ({ ...l, settings: next.settings }));
      if (mode !== 'cloud' || !writerRef.current) return;
      const target = toDocs(next, uid);
      const { set, remove } = diffDocs(docsRef.current, target);
      for (const p of set) writerRef.current.schedule(p, target[p]);
      for (const p of remove) writerRef.current.schedule(p, null);
      docsRef.current = target;
      setDocs(target);
    },
    [mode, uid],
  );

  const update = useCallback((fn: (d: AppData) => AppData) => commit(fn(dataRef.current)), [commit]);
  const replaceAll = useCallback((d: AppData) => commit(normalizeData(d)), [commit]);

  return (
    <StoreContext.Provider
      value={{ data, update, replaceAll, mode, hasPrivate: mode === 'local' || !!uid, syncError, readOnly }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** プロフィールから「誰」の表示名を返す */
export function useOwnerLabel() {
  const { data } = useStore();
  return (o: 'both' | 'me' | 'partner') =>
    o === 'both' ? 'ふたり' : o === 'me' ? data.profile.myName || '自分' : data.profile.partnerName || '相手';
}
