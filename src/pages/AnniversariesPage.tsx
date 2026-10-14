import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerLabel, useStore } from '../store';
import type { Anniversary, AnniversaryKind, Owner } from '../types';
import { newId } from '../lib/id';
import { formatJa } from '../lib/dates';
import { buildPlan, upcomingEvents } from '../lib/upcoming';
import { createEvent } from '../lib/googleCalendar';
import { useGoogle } from '../lib/useGoogle';
import { DaysBadge, Empty, Field, Modal, PageHeader } from '../components/ui';

const KIND_LABEL: Record<AnniversaryKind, string> = { birthday: '誕生日', anniversary: '記念日', other: 'その他' };

function blank(): Anniversary {
  return { id: '', kind: 'birthday', title: '', date: '', yearly: true, person: 'partner', memo: '' };
}

export default function AnniversariesPage() {
  const { data, update } = useStore();
  const google = useGoogle();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Anniversary | null>(null);
  const [message, setMessage] = useState('');

  const upcoming = upcomingEvents(data.anniversaries, data.profile);
  const byId = new Map(data.anniversaries.map((a) => [a.id, a]));
  const past = data.anniversaries.filter((a) => !upcoming.some((u) => u.anniversaryId === a.id));

  const save = (a: Anniversary) => {
    update((d) =>
      a.id
        ? { ...d, anniversaries: d.anniversaries.map((x) => (x.id === a.id ? a : x)) }
        : { ...d, anniversaries: [...d.anniversaries, { ...a, id: newId() }] },
    );
    setEditing(null);
  };
  const remove = (id: string) => {
    if (!confirm('削除しますか？（お祝い準備も削除されます）')) return;
    update((d) => ({
      ...d,
      anniversaries: d.anniversaries.filter((a) => a.id !== id),
      celebrations: d.celebrations.filter((c) => c.anniversaryId !== id),
    }));
  };

  const startPrep = (a: Anniversary, year: number, daysLeft: number) => {
    const existing = data.celebrations.find((c) => c.anniversaryId === a.id && c.year === year);
    if (existing) return navigate(`/celebrations/${existing.id}`);
    const plan = buildPlan(a, year, daysLeft, newId(), newId);
    update((d) => ({ ...d, celebrations: [...d.celebrations, plan] }));
    navigate(`/celebrations/${plan.id}`);
  };

  const addToCalendar = async (a: Anniversary) => {
    const calendarId = data.settings.sharedCalendarId;
    if (!calendarId) {
      setMessage('先にカレンダー画面で共有カレンダーを選択してください');
      return;
    }
    const token = await google.ensureToken();
    if (!token) return;
    try {
      await createEvent(token, calendarId, {
        summary: `${a.kind === 'birthday' ? '🎂' : '💍'} ${a.title}`,
        description: a.memo,
        date: a.date,
        yearly: a.yearly,
      });
      setMessage(`「${a.title}」を共有カレンダーに登録しました`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const renderItem = (a: Anniversary, extra?: { date: Date; daysLeft: number; label: string }) => (
    <li key={a.id} className="card">
      <div className="row">
        <span className="emoji">{a.kind === 'birthday' ? '🎂' : a.kind === 'anniversary' ? '💍' : '⭐'}</span>
        <div className="grow">
          <div className="todo-title">
            {a.title} {extra?.label && <span className="muted">（{extra.label}）</span>}
          </div>
          <div className="meta">
            <span className="tag">{KIND_LABEL[a.kind]}</span>
            {a.yearly && <span className="tag">毎年</span>}
            <span className="muted small">
              {extra ? `次回 ${formatJa(extra.date)}` : formatJa(a.date)}
            </span>
          </div>
          {a.memo && <p className="memo">{a.memo}</p>}
        </div>
        {extra && <DaysBadge days={extra.daysLeft} />}
      </div>
      <div className="card-actions">
        {extra && (
          <button className="btn small primary" onClick={() => startPrep(a, extra.date.getFullYear(), extra.daysLeft)}>
            🎁 お祝い準備
          </button>
        )}
        <button className="btn small" onClick={() => addToCalendar(a)} disabled={google.busy}>
          📅 カレンダーに登録
        </button>
        <button className="btn small" onClick={() => setEditing(a)}>
          編集
        </button>
        <button className="btn small danger" onClick={() => remove(a.id)}>
          削除
        </button>
      </div>
    </li>
  );

  return (
    <div className="stack">
      <PageHeader
        title="誕生日・記念日"
        sub="近い順にカウントダウン表示します"
        action={
          <button className="btn primary" onClick={() => setEditing(blank())}>
            ＋ 追加
          </button>
        }
      />
      {(message || google.error) && <div className="notice">{message || google.error}</div>}

      {upcoming.length === 0 && past.length === 0 ? (
        <Empty>ふたりの誕生日や付き合った日などを登録しましょう</Empty>
      ) : (
        <ul className="cards">
          {upcoming.map((u) => {
            if (!u.anniversaryId) {
              return (
                <li key={u.key} className="card">
                  <div className="row">
                    <span className="emoji">{u.emoji}</span>
                    <div className="grow">
                      <div className="todo-title">{u.title}</div>
                      <div className="muted small">{formatJa(u.date)}</div>
                    </div>
                    <DaysBadge days={u.daysLeft} />
                  </div>
                </li>
              );
            }
            const a = byId.get(u.anniversaryId)!;
            return renderItem(a, u);
          })}
        </ul>
      )}
      {past.length > 0 && (
        <>
          <h2 className="section-title">過去の記念日</h2>
          <ul className="cards">{past.map((a) => renderItem(a))}</ul>
        </>
      )}

      {editing && <AnniversaryForm item={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AnniversaryForm({
  item,
  onSave,
  onClose,
}: {
  item: Anniversary;
  onSave: (a: Anniversary) => void;
  onClose: () => void;
}) {
  const ownerLabel = useOwnerLabel();
  const [f, setF] = useState(() =>
    !item.title && item.kind === 'birthday' ? { ...item, title: `${ownerLabel(item.person)}の誕生日` } : item,
  );
  const set = <K extends keyof Anniversary>(k: K, v: Anniversary[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={item.id ? '記念日を編集' : '記念日を追加'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (f.title.trim() && f.date) onSave({ ...f, title: f.title.trim() });
        }}
      >
        <Field label="種類">
          <select
            value={f.kind}
            onChange={(e) => {
              const kind = e.target.value as AnniversaryKind;
              setF((p) => ({
                ...p,
                kind,
                title: p.title || (kind === 'birthday' ? `${ownerLabel(p.person)}の誕生日` : ''),
              }));
            }}
          >
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {f.kind === 'birthday' && (
          <Field label="誰の誕生日？">
            <select
              value={f.person}
              onChange={(e) => {
                const person = e.target.value as Owner;
                setF((p) => ({ ...p, person, title: `${ownerLabel(person)}の誕生日` }));
              }}
            >
              <option value="partner">{ownerLabel('partner')}</option>
              <option value="me">{ownerLabel('me')}</option>
            </select>
          </Field>
        )}
        <Field label="タイトル">
          <input
            required
            placeholder={f.kind === 'birthday' ? '例: 〇〇の誕生日' : '例: 付き合った記念日'}
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>
        <Field label={f.kind === 'birthday' ? '生年月日' : '日付'}>
          <input type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.yearly} onChange={(e) => set('yearly', e.target.checked)} />
          毎年繰り返す
        </label>
        <Field label="メモ">
          <textarea rows={2} value={f.memo} onChange={(e) => set('memo', e.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn primary">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
