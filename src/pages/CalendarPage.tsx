import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { useGoogle } from '../lib/useGoogle';
import {
  createCalendar,
  createEvent,
  deleteEvent,
  listCalendars,
  listEvents,
  shareCalendar,
  type CalendarEvent,
  type CalendarListEntry,
} from '../lib/googleCalendar';
import { formatJa, nextOccurrence, toDateString } from '../lib/dates';
import { Field, Modal, PageHeader } from '../components/ui';

interface DayItem {
  key: string;
  title: string;
  time?: string;
  kind: 'google' | 'anniversary';
  event?: CalendarEvent;
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
  const { data, update } = useStore();
  const google = useGoogle();
  const calendarId = data.settings.sharedCalendarId;
  const [month, setMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
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
    for (const e of events) {
      push(eventDateKey(e), { key: e.id, title: e.summary ?? '(無題)', time: eventTime(e), kind: 'google', event: e });
    }
    // アプリ内の記念日も重ねて表示
    const rangeStart = cells[0];
    for (const a of data.anniversaries) {
      const occ = nextOccurrence(a.date, a.yearly, rangeStart);
      if (occ && occ <= cells[41]) {
        push(toDateString(occ), { key: `a-${a.id}`, title: `${a.kind === 'birthday' ? '🎂' : '💍'} ${a.title}`, kind: 'anniversary' });
      }
    }
    return map;
  }, [events, data.anniversaries, cells]);

  const today = toDateString(new Date());
  const selectedItems = selected ? itemsByDay.get(selected) ?? [] : [];

  const remove = async (e: CalendarEvent) => {
    if (!google.token || !confirm(`「${e.summary}」を削除しますか？`)) return;
    try {
      await deleteEvent(google.token, calendarId, e.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const connected = !!google.token;
  const selectedCal = calendars.find((c) => c.id === calendarId);

  return (
    <div className="stack">
      <PageHeader
        title="ふたりのカレンダー"
        sub={selectedCal ? `Googleカレンダー「${selectedCal.summary}」と同期中` : 'Googleカレンダーの共有カレンダーと連携'}
        action={
          connected ? (
            <div className="row">
              <button className="btn" onClick={() => setShowSetup(true)}>
                カレンダー設定
              </button>
              <button className="btn" onClick={google.disconnect}>
                ログアウト
              </button>
            </div>
          ) : (
            <button className="btn primary" onClick={google.connect} disabled={google.busy}>
              Googleでログイン
            </button>
          )
        }
      />
      {!data.settings.googleClientId && (
        <div className="notice">
          Googleカレンダーを使うには <Link to="/settings">設定</Link> で OAuth クライアントIDを登録してください（README参照）。
          登録するまではアプリ内の記念日だけが表示されます。
        </div>
      )}
      {(error || google.error) && <div className="notice error">{error || google.error}</div>}
      {connected && !calendarId && (
        <div className="notice">
          共有するカレンダーがまだ選ばれていません。{' '}
          <button className="btn small primary" onClick={() => setShowSetup(true)}>
            設定する
          </button>
        </div>
      )}

      <div className="cal-head">
        <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          ◀
        </button>
        <h2>
          {month.getFullYear()}年{month.getMonth() + 1}月 {loading && <span className="muted small">読み込み中…</span>}
        </h2>
        <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
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

      {selected && (
        <section className="card">
          <div className="card-head">
            <h2>{formatJa(selected)}</h2>
            {connected && calendarId && (
              <button className="btn small primary" onClick={() => setAdding(selected)}>
                ＋ 予定を追加
              </button>
            )}
          </div>
          {selectedItems.length === 0 ? (
            <p className="muted">予定はありません</p>
          ) : (
            <ul className="list">
              {selectedItems.map((it) => (
                <li key={it.key} className="row">
                  <span className="muted small time">{it.time ?? '終日'}</span>
                  <span className="grow">
                    {it.title}
                    {it.event?.location && <span className="muted small"> 📍{it.event.location}</span>}
                  </span>
                  {it.event?.htmlLink && (
                    <a href={it.event.htmlLink} target="_blank" rel="noreferrer" className="small">
                      開く
                    </a>
                  )}
                  {it.event && (
                    <button className="icon-btn" aria-label="削除" onClick={() => remove(it.event!)}>
                      🗑
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {adding && google.token && (
        <AddEventModal
          date={adding}
          onClose={() => setAdding(null)}
          onSubmit={async (ev) => {
            try {
              await createEvent(google.token!, calendarId, ev);
              setAdding(null);
              refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}

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
              alert(`${email} を招待しました`);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
    </div>
  );
}

function AddEventModal({
  date,
  onClose,
  onSubmit,
}: {
  date: string;
  onClose: () => void;
  onSubmit: (e: { summary: string; date: string; startTime?: string; endTime?: string; location?: string; description?: string }) => void;
}) {
  const [f, setF] = useState({ summary: '', date, allDay: true, startTime: '12:00', endTime: '13:00', location: '', description: '' });
  return (
    <Modal title="予定を追加" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.summary.trim()) return;
          onSubmit({
            summary: f.summary.trim(),
            date: f.date,
            startTime: f.allDay ? undefined : f.startTime,
            endTime: f.allDay ? undefined : f.endTime,
            location: f.location || undefined,
            description: f.description || undefined,
          });
        }}
      >
        <Field label="タイトル">
          <input autoFocus required value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
        </Field>
        <Field label="日付">
          <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.allDay} onChange={(e) => setF({ ...f, allDay: e.target.checked })} />
          終日
        </label>
        {!f.allDay && (
          <div className="grid-2">
            <Field label="開始">
              <input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
            </Field>
            <Field label="終了">
              <input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label="場所">
          <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </Field>
        <Field label="メモ">
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
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

