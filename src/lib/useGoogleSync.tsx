import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMe, useStore } from '../store';
import { claudeRuntime } from './cloudSync';
import { toDateString } from './dates';
import { withActivity } from './activity';
import {
  buildListArgs,
  extractEvents,
  GCAL_LIST_TOOL,
  GCAL_SERVER,
  mergeGoogleEvents,
  nextPageTokenOf,
  SYNC_FUTURE_DAYS,
  SYNC_PAST_DAYS,
} from './googleSync';
import type { GoogleSyncSettings } from '../types';

interface McpError {
  code?: string;
  message?: string;
  retryable?: boolean;
}
interface Mcp {
  callTool(server: string, tool: string, input?: unknown, opts?: unknown): Promise<{ payload?: unknown; content?: { type: string; text?: string }[] }>;
  describeTool(server: string, tool: string): Promise<{ inputSchema: unknown }>;
}

export const DEFAULT_GSYNC: GoogleSyncSettings = { hideTitles: false, auto: false, lastSyncedAt: '' };

/** エラーコードごとに、直し方がわかる文言にする */
export function syncErrorMessage(e: McpError): string {
  switch (e.code) {
    case 'server_not_connected':
      return 'Google Calendar がつながっていません。claude.ai の「設定 → コネクタ」で Google Calendar を追加してから、もう一度同期してください。';
    case 'selection_required':
      return 'Google Calendar のコネクタが複数あります。表示された画面で使うものを選んでから、もう一度同期してください。';
    case 'needs_reauth':
      return 'Google Calendar との接続が切れています。claude.ai の「設定 → コネクタ」で再接続してください。';
    case 'not_in_manifest':
      return 'このページで Google Calendar を使うことが許可されていません。ページの「権限」メニューから Google Calendar を許可してください。';
    case 'approval_required':
      return 'Google Calendar の読み取りが許可されませんでした。「今すぐ同期」を押して、表示される確認で許可してください。';
    case 'blocked_by_policy':
      return '組織の設定で Google Calendar の利用が止められています。';
    case 'server_unavailable':
    case 'rate_limited':
      return 'Google Calendar につながりませんでした。少し待ってからもう一度お試しください。';
    case 'tool_error':
      return `Google Calendar がエラーを返しました：${e.message ?? ''}`;
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
      return 'この画面では Google Calendar の同期を使えません。';
    default:
      return `同期できませんでした（${e.code ?? 'unknown'}）。もう一度お試しください。`;
  }
}

interface GoogleSyncState {
  /** この画面でコネクタ同期が使えるか（null は確認中） */
  available: boolean | null;
  syncing: boolean;
  error: string;
  lastResult: string;
  settings: GoogleSyncSettings;
  setSettings: (patch: Partial<GoogleSyncSettings>) => void;
  sync: () => Promise<void>;
}

const Ctx = createContext<GoogleSyncState | null>(null);

export function GoogleSyncProvider({ children }: { children: ReactNode }) {
  const { data, update, mode, readOnly } = useStore();
  const me = useMe();
  const [mcp, setMcp] = useState<Mcp | null>(null);
  const [available, setAvailable] = useState<boolean | null>(claudeRuntime() ? null : false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const settings = { ...DEFAULT_GSYNC, ...data.settings.gsync };
  const autoTried = useRef(false);

  useEffect(() => {
    const c = claudeRuntime();
    if (!c) return;
    c.use('mcp')
      .then((m) => {
        setMcp((m as Mcp) ?? null);
        setAvailable(!!m);
      })
      .catch(() => setAvailable(false));
  }, []);

  const setSettings = useCallback(
    (patch: Partial<GoogleSyncSettings>) =>
      update((d) => ({ ...d, settings: { ...d.settings, gsync: { ...DEFAULT_GSYNC, ...d.settings.gsync, ...patch } } })),
    [update],
  );

  const sync = useCallback(async () => {
    if (!mcp || !me || syncing || readOnly) return;
    setSyncing(true);
    setError('');
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - SYNC_PAST_DAYS);
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + SYNC_FUTURE_DAYS, 23, 59);
    const schemaOf = () =>
      mcp
        .describeTool(GCAL_SERVER, GCAL_LIST_TOOL)
        .then((t) => t.inputSchema as Parameters<typeof buildListArgs>[0])
        .catch(() => null);
    const call = (schema: Parameters<typeof buildListArgs>[0], pageToken?: string) =>
      mcp.callTool(GCAL_SERVER, GCAL_LIST_TOOL, buildListArgs(schema, from, to, pageToken), { cache: false });
    const payloadOf = (r: Awaited<ReturnType<typeof call>>) => r.payload ?? r.content?.find((b) => b.type === 'text')?.text;
    try {
      let schema = await schemaOf();
      let res;
      try {
        res = await call(schema);
      } catch (e) {
        // 初回は許可の前でスキーマが読めず、引数名が合わないことがある。許可後のスキーマで1回だけやり直す
        if ((e as McpError).code !== 'tool_error' || schema) throw e;
        schema = await schemaOf();
        if (!schema) throw e;
        res = await call(schema);
      }
      let payload = payloadOf(res);
      const imported = extractEvents(payload);
      // 予定が多いときは続きのページも読む（最大4ページ＝1000件）
      for (let page = 1; page < 4; page++) {
        const token = nextPageTokenOf(payload);
        if (!token) break;
        payload = payloadOf(await call(schema, token));
        imported.push(...extractEvents(payload));
      }
      const range = { from: toDateString(from), to: toDateString(to) };
      let added = 0;
      update((d) => {
        const before = new Set(d.events.map((e) => e.id));
        const events = mergeGoogleEvents(d.events, imported, me, range, settings.hideTitles);
        added = events.filter((e) => !before.has(e.id)).length;
        const next = {
          ...d,
          events,
          settings: { ...d.settings, gsync: { ...settings, auto: true, lastSyncedAt: new Date().toISOString() } },
        };
        return added > 0 ? withActivity(next, me, `Googleカレンダーから予定を${added}件取り込みました`, '/calendar') : next;
      });
      setLastResult(`${imported.length}件の予定を同期しました`);
    } catch (e) {
      setError(syncErrorMessage((e ?? {}) as McpError));
    } finally {
      setSyncing(false);
    }
  }, [mcp, me, syncing, readOnly, update, settings]);

  // 一度同期したことがある端末では、開いたときに自動で同期する（30分以内なら省略）
  useEffect(() => {
    if (autoTried.current || !mcp || !me || mode !== 'cloud' || !settings.auto) return;
    autoTried.current = true;
    const last = settings.lastSyncedAt ? new Date(settings.lastSyncedAt).getTime() : 0;
    if (Date.now() - last > 30 * 60 * 1000) void sync();
  }, [mcp, me, mode, settings.auto, settings.lastSyncedAt, sync]);

  return (
    <Ctx.Provider value={{ available, syncing, error, lastResult, settings, setSettings, sync }}>{children}</Ctx.Provider>
  );
}

export function useGoogleSync(): GoogleSyncState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGoogleSync must be used inside GoogleSyncProvider');
  return v;
}
