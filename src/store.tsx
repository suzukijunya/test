import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppData } from './types';

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
  };
}

/** 保存データを読み込み、欠けているフィールドを既定値で補う */
export function normalizeData(raw: unknown): AppData {
  const empty = createEmptyData();
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    profile: { ...empty.profile, ...r.profile },
    settings: { ...empty.settings, ...r.settings },
    todos: Array.isArray(r.todos) ? r.todos : [],
    anniversaries: Array.isArray(r.anniversaries) ? r.anniversaries : [],
    celebrations: Array.isArray(r.celebrations) ? r.celebrations : [],
    vlogs: Array.isArray(r.vlogs) ? r.vlogs : [],
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

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replaceAll: (d: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 容量超過などは無視（データはメモリ上に残る）
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);
  const replaceAll = useCallback((d: AppData) => setData(normalizeData(d)), []);

  return <StoreContext.Provider value={{ data, update, replaceAll }}>{children}</StoreContext.Provider>;
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
