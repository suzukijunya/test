/**
 * Google カレンダー連携（ブラウザのみで完結）
 * Google Identity Services でアクセストークンを取得し、Calendar API v3 を直接呼び出す。
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com/calendar/v3';
/** 共有カレンダーの作成・メンバー招待（ACL）も行うためフルスコープを要求する */
const SCOPE = 'https://www.googleapis.com/auth/calendar';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisPromise = null;
        reject(new Error('Googleログインの読み込みに失敗しました'));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
}

export async function signIn(clientId: string): Promise<GoogleToken> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error_description || r.error || 'ログインに失敗しました'));
          return;
        }
        resolve({ accessToken: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 });
      },
      error_callback: (e) => reject(new Error(e.message || e.type)),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function signOut(token: GoogleToken) {
  window.google?.accounts.oauth2.revoke(token.accessToken);
}

async function api<T>(token: GoogleToken, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(`Google Calendar API エラー: ${msg}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  accessRole: string;
  backgroundColor?: string;
  primary?: boolean;
}

export async function listCalendars(token: GoogleToken): Promise<CalendarListEntry[]> {
  const r = await api<{ items?: CalendarListEntry[] }>(token, '/users/me/calendarList?minAccessRole=writer');
  return r.items ?? [];
}

/** 二人用の新しいカレンダーを作成する */
export async function createCalendar(token: GoogleToken, summary: string): Promise<CalendarListEntry> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api<CalendarListEntry>(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary, timeZone: tz }),
  });
}

/** パートナーをカレンダーに招待（編集権限） */
export async function shareCalendar(token: GoogleToken, calendarId: string, email: string): Promise<void> {
  await api(token, `/calendars/${encodeURIComponent(calendarId)}/acl?sendNotifications=true`, {
    method: 'POST',
    body: JSON.stringify({ role: 'writer', scope: { type: 'user', value: email } }),
  });
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  creator?: { email?: string };
}

export async function listEvents(
  token: GoogleToken,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const q = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const r = await api<{ items?: CalendarEvent[] }>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
  );
  return r.items ?? [];
}

export interface NewEvent {
  summary: string;
  description?: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm（未指定なら終日） */
  startTime?: string;
  endTime?: string;
  /** 毎年繰り返す（誕生日・記念日用） */
  yearly?: boolean;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function buildEventBody(e: NewEvent, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const allDay = !e.startTime;
  const body: Record<string, unknown> = {
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: allDay ? { date: e.date } : { dateTime: `${e.date}T${e.startTime}:00`, timeZone },
    end: allDay
      ? { date: addDays(e.date, 1) }
      : { dateTime: `${e.date}T${e.endTime || e.startTime}:00`, timeZone },
  };
  if (e.yearly) body.recurrence = ['RRULE:FREQ=YEARLY'];
  return body;
}

export async function createEvent(token: GoogleToken, calendarId: string, e: NewEvent): Promise<CalendarEvent> {
  return api<CalendarEvent>(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(buildEventBody(e)),
  });
}

export async function deleteEvent(token: GoogleToken, calendarId: string, eventId: string): Promise<void> {
  await api(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}
