/**
 * claude.ai Artifact の db capability を使ったクラウド同期。
 * アプリデータを「1アイテム = 1ドキュメント」に分解して保存し、二人の端末でリアルタイムに共有する。
 * サプライズ（secret）のお祝いプランは各自の非公開領域 data/users/<id>/ に保存し、相手からは見えない。
 */
import type { AppData, CelebrationPlan } from '../types';

export const SHARED_COLLECTIONS = ['todos', 'anniversaries', 'celebrations', 'vlogs', 'events'] as const;
export const PROFILE_PATH = 'meta/profile';
const PRIVATE_CEL_PREFIX = 'cel_';

export type DocMap = Record<string, Record<string, unknown>>;

export function privateCollection(uid: string) {
  return `data/users/${uid}`;
}

function clean<T>(v: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(v));
}

/** AppData → ドキュメントパスと本体の対応表 */
export function toDocs(data: AppData, uid: string | null): DocMap {
  const docs: DocMap = {};
  docs[PROFILE_PATH] = clean(data.profile);
  for (const col of SHARED_COLLECTIONS) {
    for (const item of data[col]) {
      if (col === 'celebrations' && (item as CelebrationPlan).secret && uid) {
        docs[`${privateCollection(uid)}/${PRIVATE_CEL_PREFIX}${item.id}`] = clean(item);
      } else {
        docs[`${col}/${item.id}`] = clean(item);
      }
    }
  }
  return docs;
}

/** ドキュメント群 → AppData（settings は端末ごとの値を使う） */
export function fromDocs(docs: DocMap, base: AppData, uid: string | null): AppData {
  const out: AppData = {
    ...base,
    profile: { ...base.profile, ...(docs[PROFILE_PATH] as Partial<AppData['profile']> | undefined) },
    todos: [],
    anniversaries: [],
    celebrations: [],
    vlogs: [],
    events: [],
  };
  const priv = uid ? `${privateCollection(uid)}/${PRIVATE_CEL_PREFIX}` : null;
  for (const [path, body] of Object.entries(docs)) {
    const [col] = path.split('/');
    if ((SHARED_COLLECTIONS as readonly string[]).includes(col) && path.split('/').length === 2) {
      (out[col as (typeof SHARED_COLLECTIONS)[number]] as unknown[]).push(body);
    } else if (priv && path.startsWith(priv)) {
      out.celebrations.push(body as unknown as CelebrationPlan);
    }
  }
  return out;
}

/** 現在と目標の差分（書き込み・削除するパス） */
export function diffDocs(prev: DocMap, next: DocMap): { set: string[]; remove: string[] } {
  const set: string[] = [];
  const remove: string[] = [];
  for (const [path, body] of Object.entries(next)) {
    if (!(path in prev) || JSON.stringify(prev[path]) !== JSON.stringify(body)) set.push(path);
  }
  for (const path of Object.keys(prev)) if (!(path in next)) remove.push(path);
  return { set, remove };
}

/** collection 直下のドキュメントか */
export function isDirectChild(path: string, collection: string) {
  return path.startsWith(collection + '/') && path.split('/').length === collection.split('/').length + 1;
}

// ---- 最小限の db 型（capability の定義より抜粋） ----
export interface DbSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
export interface DbDocRef {
  set(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: DbSnap) => void, err?: (e: { code: string; message: string }) => void): () => void;
}
export interface DbQuerySnap {
  docs: DbSnap[];
}
export interface DbColRef {
  onSnapshot(next: (s: DbQuerySnap) => void, err?: (e: { code: string; message: string }) => void): () => void;
}
export interface Db {
  doc(path: string): DbDocRef;
  collection(path: string): DbColRef;
}
interface UserCap {
  id(): Promise<string | null>;
}
interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

export function claudeRuntime(): ClaudeRuntime | null {
  const c = (window as unknown as { claude?: ClaudeRuntime }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

export async function connectCloud(): Promise<{ db: Db; uid: string | null } | null> {
  const c = claudeRuntime();
  if (!c) return null;
  const db = (await c.use('db')) as Db | null;
  if (!db) return null;
  const user = (await c.use('user')) as UserCap | null;
  const uid = user ? await user.id().catch(() => null) : null;
  return { db, uid };
}

/**
 * ドキュメントごとの書き込みキュー。
 * 連続入力はまとめて1回にし、同じドキュメントへの書き込みは1つずつ順番に行う。
 */
export class Writer {
  private pending = new Map<string, Record<string, unknown> | null>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private inflight = new Set<string>();
  private active = 0;
  private waiting: string[] = [];

  constructor(
    private db: Db,
    private onError: (e: { code?: string; message?: string }) => void,
    private onIdle: (path: string) => void,
    private delayMs = 400,
    private concurrency = 4,
  ) {}

  /** まだサーバーに反映されていないパス */
  isPending(path: string) {
    return this.pending.has(path) || this.inflight.has(path);
  }

  schedule(path: string, body: Record<string, unknown> | null) {
    this.pending.set(path, body);
    clearTimeout(this.timers.get(path));
    this.timers.set(
      path,
      setTimeout(() => {
        this.timers.delete(path);
        this.enqueue(path);
      }, this.delayMs),
    );
  }

  private enqueue(path: string) {
    if (this.inflight.has(path) || this.waiting.includes(path)) return;
    this.waiting.push(path);
    this.pump();
  }

  private pump() {
    while (this.active < this.concurrency && this.waiting.length) {
      const path = this.waiting.shift()!;
      if (!this.pending.has(path)) continue;
      const body = this.pending.get(path)!;
      this.pending.delete(path);
      this.inflight.add(path);
      this.active++;
      const ref = this.db.doc(path);
      (body ? ref.set(body) : ref.delete())
        .catch((e) => this.onError(e ?? {}))
        .finally(() => {
          this.inflight.delete(path);
          this.active--;
          // 書き込み中に新しい変更が来ていたら続けて書く
          if (this.pending.has(path) && !this.timers.has(path)) this.waiting.push(path);
          if (!this.isPending(path)) this.onIdle(path);
          this.pump();
        });
    }
  }
}
