import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useMe, useOwnerLabel, useStore } from '../store';
import { withActivity, timeAgo } from '../lib/activity';
import type { CalendarEntry, EventComment, Owner } from '../types';
import { newId } from '../lib/id';
import { useGoogle } from '../lib/useGoogle';
import {
  createCalendar,
  createEvent,
  deleteEvent,
  listCalendars,
  listEvents,
  shareCalendar,
  addToGoogleCalendarUrl,
  type NewEvent,
  type CalendarEvent,
  type CalendarListEntry,
} from '../lib/googleCalendar';
import { formatJa, nextOccurrence, toDateString } from '../lib/dates';
import { ConfirmButton, Field, Modal, PageHeader } from '../components/ui';

interface DayItem {
  key: string;
  title: string;
  time?: string;
  kind: 'google' | 'anniversary' | 'app';
  event?: CalendarEvent;
  entry?: CalendarEntry;
}

function eventDateKey(e: CalendarEvent): string {
  if (e.start.date) return e.start.date;
  return toDateString(new Date(e.start.dateTime!));
}

function eventTime(e: CalendarEvent): string | undefined {
  if (!e.start.dateTime) return undefined;
  const d = new Date(e.start.dateTime);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const { data, update, mode } = useStore();
  const ownerLabel = useOwnerLabel();
  const me = useMe();
  const google = useGoogle();
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  /** Google API での直接連携は、ブラウザで直接開いたとき（ローカル版）のみ利用できる */
  const googleApi = mode === 'local';
  const calendarId = data.settings.sharedCalendarId;
  const [month, setMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>(() => toDateString(new Date()));
  const [adding, setAdding] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const setCalendarId = (id: string) =>
    update((d) => ({ ...d, settings: { ...d.settings, sharedCalendarId: id } }));

  const refresh = useCallback(async () => {
    if (!google.token || !calendarId) return;
    setLoading(true);
    setError('');
    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1 - 7);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 7);
      setEvents(await listEvents(google.token, calendarId, start, end));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [google.token, calendarId, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!google.token) return;
    listCalendars(google.token)
      .then(setCalendars)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [google.token]);

  // 月表示用のセル（日曜始まり、6週）
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (k: string, item: DayItem) => map.set(k, [...(map.get(k) ?? []), item]);
    for (const e of [...data.events].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))) {
      push(e.date, { key: `e-${e.id}`, title: e.title, time: e.startTime || undefined, kind: 'app', entry: e });
    }
    for (const e of events) {
      push(eventDateKey(e), { key: e.id, title: e.summary ?? '(無題)', time: eventTime(e), kind: 'google', event: e });
    }
    // 記念日も重ねて表示
    const rangeStart = cells[0];
    for (const a of data.anniversaries) {
      const occ = nextOccurrence(a.date, a.yearly, rangeStart);
      if (occ && occ <= cells[41]) {
        push(toDateString(occ), { key: `a-${a.id}`, title: `${a.kind === 'birthday' ? '🎂' : '💍'} ${a.title}`, kind: 'anniversary' });
      }
    }
    return map;
  }, [events, data.events, data.anniversaries, cells]);

  const today = toDateString(new Date());
  const selectedItems = itemsByDay.get(selected) ?? [];

  const removeGoogle = async (e: CalendarEvent) => {
    if (!google.token) return;
    try {
      await deleteEvent(google.token, calendarId, e.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const removeEntry = (id: string) =>
    update((d) => ({
      ...d,
      events: d.events.filter((e) => e.id !== id),
      comments: d.comments.filter((c) => c.eventId !== id),
    }));
  const opened = data.events.find((e) => e.id === openEntry);

  const connected = googleApi && !!google.token;
  const selectedCal = calendars.find((c) => c.id === calendarId);

  return (
    <div className="stack">
      <ScheduleTabs />
      <PageHeader
        title="ふたりのカレンダー"
        sub={
          selectedCal
            ? `ふたりの予定 ＋ Googleカレンダー「${selectedCal.summary}」`
            : 'ふたりの予定・記念日をまとめて表示'
        }
        action={
          <div className="row wrap">
            <button className="btn primary" onClick={() => setAdding(selected)}>
              ＋ 予定を追加
            </button>
            {googleApi &&
              (connected ? (
                <>
                  <button className="btn" onClick={() => setShowSetup(true)}>
                    カレンダー設定
                  </button>
                  <button className="btn" onClick={google.disconnect}>
                    ログアウト
                  </button>
                </>
              ) : (
                data.settings.googleClientId && (
                  <button className="btn" onClick={google.connect} disabled={google.busy}>
                    Googleと連携
                  </button>
                )
              ))}
          </div>
        }
      />
      {!googleApi && (
        <p className="muted small">
          ここに登録した予定はふたりの間で共有されます。各予定の「Googleカレンダーに追加」から、自分のGoogleカレンダーにも登録できます。
        </p>
      )}
      {message && <div className="notice">{message}</div>}
      {googleApi && (error || google.error) && <div className="notice error">{error || google.error}</div>}
      {connected && !calendarId && (
        <div className="notice">
          共有するGoogleカレンダーがまだ選ばれていません。{' '}
          <button className="btn small primary" onClick={() => setShowSetup(true)}>
            設定する
          </button>
        </div>
      )}

      <div className="cal-head">
        <button
          className="icon-btn"
          aria-label="前の月"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          ◀
        </button>
        <h2>
          {month.getFullYear()}年{month.getMonth() + 1}月 {loading && <span className="muted small">読み込み中…</span>}
        </h2>
        <button
          className="icon-btn"
          aria-label="次の月"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          ▶
        </button>
      </div>
      <div className="cal-grid">
        {'日月火水木金土'.split('').map((w, i) => (
          <div key={w} className={`cal-w ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const k = toDateString(d);
          const items = itemsByDay.get(k) ?? [];
          const outside = d.getMonth() !== month.getMonth();
          return (
            <button
              key={k}
              className={`cal-cell ${outside ? 'outside' : ''} ${k === today ? 'today' : ''} ${k === selected ? 'selected' : ''}`}
              onClick={() => setSelected(k)}
            >
              <span className="cal-date">{d.getDate()}</span>
              {items.slice(0, 3).map((it) => (
                <span key={it.key} className={`cal-ev ${it.kind}`}>
                  {it.title}
                </span>
              ))}
              {items.length > 3 && <span className="cal-more">+{items.length - 3}</span>}
            </button>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>{formatJa(selected)}</h2>
          <button className="btn small primary" onClick={() => setAdding(selected)}>
            ＋ 追加
          </button>
        </div>
        {selectedItems.length === 0 ? (
          <p className="muted">予定はありません</p>
        ) : (
          <ul className="list">
            {selectedItems.map((it) => (
              <li key={it.key} className="row wrap">
                <span className="muted small time">
                  {it.entry ? (it.entry.startTime ? `${it.entry.startTime}` : '終日') : (it.time ?? '終日')}
                </span>
                <span className="grow">
                  {it.title}
                  {it.entry && <span className="tag owner"> {ownerLabel(it.entry.owner)}</span>}
                  {(it.entry?.location || it.event?.location) && (
                    <span className="muted small"> 📍{it.entry?.location || it.event?.location}</span>
                  )}
                  {it.entry?.memo && <span className="memo small">{it.entry.memo}</span>}
                </span>
                {it.entry && (
                  <button className="btn small" onClick={() => setOpenEntry(it.entry!.id)}>
                    💬 <span className="count">{data.comments.filter((c) => c.eventId === it.entry!.id).length}</span>
                  </button>
                )}
                {it.entry && (
                  <a className="small" href={entryGoogleUrl(it.entry)} target="_blank" rel="noreferrer">
                    Googleに追加
                  </a>
                )}
                {it.event?.htmlLink && (
                  <a href={it.event.htmlLink} target="_blank" rel="noreferrer" className="small">
                    Googleで開く
                  </a>
                )}
                {it.entry && (
                  <ConfirmButton className="icon-btn" confirmLabel="削除？" ariaLabel="削除" onConfirm={() => removeEntry(it.entry!.id)}>
                    🗑
                  </ConfirmButton>
                )}
                {it.event && (
                  <ConfirmButton className="icon-btn" confirmLabel="削除？" ariaLabel="削除" onConfirm={() => removeGoogle(it.event!)}>
                    🗑
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && (
        <AddEventModal
          date={adding}
          canPushToGoogle={connected && !!calendarId}
          onClose={() => setAdding(null)}
          onSubmit={async (entry, pushToGoogle) => {
            update((d) =>
              withActivity(
                { ...d, events: [...d.events, { ...entry, id: newId() }] },
                me,
                `予定「${entry.title}」（${formatJa(entry.date)}）を追加しました`,
                '/calendar',
              ),
            );
            setSelected(entry.date);
            setAdding(null);
            if (pushToGoogle && google.token) {
              try {
                await createEvent(google.token, calendarId, entryToNewEvent(entry));
                refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }
          }}
        />
      )}

      {opened && <EntryModal entry={opened} onClose={() => setOpenEntry(null)} />}

      {showSetup && google.token && (
        <CalendarSetupModal
          calendars={calendars}
          current={calendarId}
          onClose={() => setShowSetup(false)}
          onSelect={(id) => {
            setCalendarId(id);
            setShowSetup(false);
          }}
          onCreate={async (name, partnerEmail) => {
            try {
              const cal = await createCalendar(google.token!, name);
              if (partnerEmail) await shareCalendar(google.token!, cal.id, partnerEmail);
              setCalendars(await listCalendars(google.token!));
              setCalendarId(cal.id);
              setShowSetup(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
          onInvite={async (email) => {
            try {
              await shareCalendar(google.token!, calendarId, email);
              setMessage(`${email} を招待しました`);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
    </div>
  );
}

function entryToNewEvent(e: Omit<CalendarEntry, 'id'>): NewEvent {
  return {
    summary: e.title,
    date: e.date,
    startTime: e.startTime || undefined,
    endTime: e.endTime || undefined,
    location: e.location || undefined,
    description: e.memo || undefined,
  };
}

function entryGoogleUrl(e: CalendarEntry) {
  return addToGoogleCalendarUrl(entryToNewEvent(e));
}

function AddEventModal({
  date,
  canPushToGoogle,
  onClose,
  onSubmit,
}: {
  date: string;
  canPushToGoogle: boolean;
  onClose: () => void;
  onSubmit: (e: Omit<CalendarEntry, 'id'>, pushToGoogle: boolean) => void;
}) {
  const ownerLabel = useOwnerLabel();
  const [f, setF] = useState({
    title: '',
    date,
    allDay: true,
    startTime: '12:00',
    endTime: '13:00',
    location: '',
    memo: '',
    owner: 'both' as Owner,
  });
  const [push, setPush] = useState(true);
  return (
    <Modal title="予定を追加" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim()) return;
          onSubmit(
            {
              title: f.title.trim(),
              date: f.date,
              startTime: f.allDay ? '' : f.startTime,
              endTime: f.allDay ? '' : f.endTime,
              location: f.location,
              memo: f.memo,
              owner: f.owner,
            },
            canPushToGoogle && push,
          );
        }}
      >
        <Field label="タイトル">
          <input id="ev-title" autoFocus required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <div className="grid-2">
          <Field label="日付">
            <input id="ev-date" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="誰の予定？">
            <select id="ev-owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value as Owner })}>
              {(['both', 'me', 'partner'] as Owner[]).map((o) => (
                <option key={o} value={o}>
                  {ownerLabel(o)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.allDay} onChange={(e) => setF({ ...f, allDay: e.target.checked })} />
          終日
        </label>
        {!f.allDay && (
          <div className="grid-2">
            <Field label="開始">
              <input id="ev-start" type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
            </Field>
            <Field label="終了">
              <input id="ev-end" type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label="場所">
          <input id="ev-location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </Field>
        <Field label="メモ">
          <textarea id="ev-memo" rows={2} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} />
        </Field>
        {canPushToGoogle && (
          <label className="check">
            <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
            共有Googleカレンダーにも登録する
          </label>
        )}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn primary">
            追加
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CalendarSetupModal({
  calendars,
  current,
  onClose,
  onSelect,
  onCreate,
  onInvite,
}: {
  calendars: CalendarListEntry[];
  current: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string, partnerEmail: string) => void;
  onInvite: (email: string) => void;
}) {
  const [name, setName] = useState('ふたりのカレンダー');
  const [email, setEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  return (
    <Modal title="共有カレンダーの設定" onClose={onClose}>
      <div className="stack">
        <section>
          <h3>既存のカレンダーを使う</h3>
          <p className="muted small">パートナーから共有されたカレンダーもここに表示されます</p>
          <ul className="list">
            {calendars.map((c) => (
              <li key={c.id} className="row">
                <span className="dot" style={{ background: c.backgroundColor }} />
                <span className="grow">
                  {c.summary} {c.primary && <span className="muted small">(メイン)</span>}
                </span>
                {c.id === current ? (
                  <span className="tag">選択中</span>
                ) : (
                  <button className="btn small" onClick={() => onSelect(c.id)}>
                    これを使う
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        {current && (
          <section className="form">
            <h3>パートナーを招待</h3>
            <div className="inline-form">
              <input
                type="email"
                placeholder="partner@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button className="btn" disabled={!inviteEmail} onClick={() => onInvite(inviteEmail)}>
                招待
              </button>
            </div>
          </section>
        )}
        <section className="form">
          <h3>新しく共有カレンダーを作る</h3>
          <Field label="カレンダー名">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="パートナーのGoogleアカウント（編集権限で招待）">
            <input type="email" placeholder="partner@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), email.trim())}>
            作成して共有
          </button>
        </section>
      </div>
    </Modal>
  );
}


/** 予定の詳細とコメント（TimeTree風） */
function EntryModal({ entry, onClose }: { entry: CalendarEntry; onClose: () => void }) {
  const { data, update } = useStore();
  const ownerLabel = useOwnerLabel();
  const me = useMe();
  const [text, setText] = useState('');
  const comments = data.comments.filter((c) => c.eventId === entry.id).sort((a, b) => a.at.localeCompare(b.at));

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const c: EventComment = { id: newId(), eventId: entry.id, author: me ?? 'both', text: t, at: new Date().toISOString() };
    update((d) => withActivity({ ...d, comments: [...d.comments, c] }, me, `「${entry.title}」にコメント: ${t.slice(0, 30)}`, '/calendar'));
    setText('');
  };

  return (
    <Modal title={entry.title} onClose={onClose}>
      <div className="stack">
        <div className="meta">
          <span className="tag">{formatJa(entry.date)}</span>
          <span className="tag">{entry.startTime ? `${entry.startTime}〜${entry.endTime}` : '終日'}</span>
          <span className="tag owner">{ownerLabel(entry.owner)}</span>
        </div>
        {entry.location && <p className="small">📍 {entry.location}</p>}
        {entry.memo && <p className="memo">{entry.memo}</p>}
        <a className="btn small" href={entryGoogleUrl(entry)} target="_blank" rel="noreferrer">
          📅 Googleカレンダーに追加
        </a>
        <section>
          <h3>💬 コメント</h3>
          {comments.length === 0 ? (
            <p className="muted small">「楽しみ！」「何時に待ち合わせる？」など、予定についてやりとりできます</p>
          ) : (
            <div className="thread">
              {comments.map((c) => (
                <div key={c.id} className={`bubble ${me && c.author === me ? 'mine' : ''}`}>
                  <span className="by">
                    {ownerLabel(c.author)}・{timeAgo(c.at)}
                  </span>
                  {c.text}
                </div>
              ))}
            </div>
          )}
          {!me && <p className="muted small">設定で「この端末を使っているのは？」を選ぶと、誰のコメントか表示されます</p>}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input id="comment-text" placeholder="コメントを書く" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn primary">送信</button>
          </form>
        </section>
      </div>
    </Modal>
  );
}

/** カレンダーとメモの切り替え */
export function ScheduleTabs() {
  return (
    <nav className="tabs" aria-label="予定とメモ">
      <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>
        📅 カレンダー
      </NavLink>
      <NavLink to="/memos" className={({ isActive }) => (isActive ? 'active' : '')}>
        📝 メモ
      </NavLink>
    </nav>
  );
}
