/**
 * claude.ai の Google Calendar コネクタ（mcp capability）から自分の予定を取り込む。
 * list_events は startTime / endTime（UTCオフセットなしの現地時刻）、pageSize（最大250）、
 * orderBy、pageToken を受け取り、{ events: [...], nextPageToken } を返す。
 * 念のため引数はツールのスキーマ（describeTool）に合わせ、返り値も別の形を広く受け付ける。
 */
import type { CalendarEntry, Owner } from '../types';
import { toDateString } from './dates';

export const GCAL_SERVER = 'Google Calendar';
export const GCAL_LIST_TOOL = 'list_events';
/** 今日から何日先まで同期するか */
export const SYNC_PAST_DAYS = 7;
export const SYNC_FUTURE_DAYS = 60;

type Schema = { properties?: Record<string, { type?: string | string[] }> } | null | undefined;

const pick = (props: string[], candidates: string[]) => {
  const lower = props.map((p) => p.toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return props[i];
  }
  return null;
};

/** "2026-10-15T09:30:00"（UTCオフセットなしの現地時刻） */
export function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** list_events の入力をスキーマに合わせて作る（スキーマが読めなければ Google Calendar コネクタの引数名で送る） */
export function buildListArgs(schema: Schema, timeMin: Date, timeMax: Date, pageToken?: string): Record<string, unknown> {
  const props = Object.keys(schema?.properties ?? {});
  if (props.length === 0) {
    const args: Record<string, unknown> = { startTime: localIso(timeMin), endTime: localIso(timeMax), pageSize: 250, orderBy: 'startTime' };
    if (pageToken) args.pageToken = pageToken;
    return args;
  }
  const args: Record<string, unknown> = {};
  const min = pick(props, ['time_min', 'timeMin', 'start_time', 'startTime', 'start_date', 'startDate', 'start', 'from', 'after']);
  const max = pick(props, ['time_max', 'timeMax', 'end_time', 'endTime', 'end_date', 'endDate', 'end', 'to', 'before']);
  if (min) args[min] = localIso(timeMin);
  if (max) args[max] = localIso(timeMax);
  const limit = pick(props, ['max_results', 'maxResults', 'limit', 'page_size', 'pageSize']);
  if (limit) args[limit] = 250;
  const single = pick(props, ['single_events', 'singleEvents', 'expand_recurring', 'expandRecurring']);
  if (single) args[single] = true;
  const order = pick(props, ['order_by', 'orderBy']);
  if (order) args[order] = 'startTime';
  const token = pick(props, ['pageToken', 'page_token', 'cursor']);
  if (token && pageToken) args[token] = pageToken;
  return args;
}

/** 返り値から次ページのトークンを取り出す */
export function nextPageTokenOf(payload: unknown): string | null {
  let v = payload;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!isObj(v)) return null;
  const t = v.nextPageToken ?? v.next_page_token ?? v.nextCursor;
  return typeof t === 'string' && t ? t : null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** 返り値の中から「予定っぽいオブジェクトの配列」を探す */
function findEventArray(v: unknown, depth = 0): Obj[] | null {
  if (depth > 4) return null;
  if (typeof v === 'string') {
    try {
      return findEventArray(JSON.parse(v), depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) {
    const objs = v.filter(isObj);
    if (objs.length && objs.some((o) => 'start' in o || 'start_time' in o || 'startTime' in o || 'summary' in o)) return objs;
    return null;
  }
  if (isObj(v)) {
    for (const key of ['events', 'items', 'data', 'results', 'result', 'value']) {
      if (key in v) {
        const r = findEventArray(v[key], depth + 1);
        if (r) return r;
      }
    }
    for (const val of Object.values(v)) {
      const r = findEventArray(val, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** "2026-10-14T18:00:00+09:00" / "2026-10-14" / {dateTime} / {date} を解釈 */
function parseWhen(v: unknown): { date: string; time: string } | null {
  if (isObj(v)) {
    if (v.dateTime || v.date_time) return parseWhen(v.dateTime ?? v.date_time);
    if (v.date) return parseWhen(v.date);
    return null;
  }
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, time: '' };
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return { date: toDateString(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
}

export interface ImportedEvent {
  googleId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

/** コネクタの返り値を予定の一覧に変換する（解釈できないものは飛ばす） */
export function extractEvents(payload: unknown): ImportedEvent[] {
  const arr = findEventArray(payload) ?? [];
  const out: ImportedEvent[] = [];
  for (const o of arr) {
    const status = str(o.status).toLowerCase();
    if (status === 'cancelled') continue;
    const start = parseWhen(o.start ?? o.start_time ?? o.startTime ?? o.start_date);
    if (!start) continue;
    const end = parseWhen(o.end ?? o.end_time ?? o.endTime ?? o.end_date);
    const allDay = !start.time || o.all_day === true || o.allDay === true;
    const id = str(o.id ?? o.event_id ?? o.eventId ?? o.iCalUID ?? o.ical_uid) || `${start.date}T${start.time}:${str(o.summary ?? o.title)}`;
    out.push({
      googleId: id,
      title: str(o.summary ?? o.title ?? o.name) || '(タイトルなし)',
      date: start.date,
      startTime: allDay ? '' : start.time,
      endTime: allDay ? '' : end && end.date === start.date ? end.time : '',
      location: str(o.location),
    });
  }
  return out;
}

/** パスに使える安全なID */
export function entryIdFor(owner: Owner, googleId: string): string {
  let h = 0;
  for (const c of googleId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const safe = googleId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
  return `g-${owner}-${safe || 'x'}-${h.toString(36)}`;
}

/**
 * 同期結果を反映する: この人のGoogle由来の予定のうち、同期範囲内のものを入れ替える。
 * 範囲外（過去・遠い未来）の予定はそのまま残す。
 */
export function mergeGoogleEvents(
  current: CalendarEntry[],
  imported: ImportedEvent[],
  owner: Owner,
  range: { from: string; to: string },
  hideTitles: boolean,
): CalendarEntry[] {
  const inRange = (d: string) => d >= range.from && d <= range.to;
  const kept = current.filter((e) => !(e.source === 'google' && e.owner === owner && inRange(e.date)));
  const prevById = new Map(current.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const added: CalendarEntry[] = [];
  for (const ev of imported) {
    const id = entryIdFor(owner, ev.googleId + (ev.date || ''));
    if (seen.has(id) || !inRange(ev.date)) continue;
    seen.add(id);
    const prev = prevById.get(id);
    added.push({
      id,
      title: hideTitles ? '予定あり' : ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: hideTitles ? '' : ev.location,
      memo: prev?.memo ?? '',
      owner,
      source: 'google',
      googleId: ev.googleId,
    });
  }
  return [...kept, ...added];
}
