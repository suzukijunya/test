import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Anniversary, CelebrationPlan, GiftIdea } from '../types';
import { newId } from '../lib/id';
import { daysBetween, formatJa, parseDate, sameDayInYear } from '../lib/dates';
import { buildPlan, planProgress, upcomingEvents } from '../lib/upcoming';
import { ConfirmButton, DaysBadge, Empty, Field, PageHeader } from '../components/ui';

function planDate(a: Anniversary, year: number): Date {
  return a.yearly ? sameDayInYear(parseDate(a.date), year) : parseDate(a.date);
}

export default function CelebrationsPage() {
  const { id } = useParams();
  return id ? <PlanDetail id={id} /> : <PlanList />;
}

function PlanList() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const today = new Date();
  const byId = new Map(data.anniversaries.map((a) => [a.id, a]));

  const plans = data.celebrations
    .map((p) => ({ p, a: byId.get(p.anniversaryId) }))
    .filter((x): x is { p: CelebrationPlan; a: Anniversary } => !!x.a)
    .map((x) => ({ ...x, date: planDate(x.a, x.p.year) }))
    .sort((x, y) => x.date.getTime() - y.date.getTime());
  const active = plans.filter((x) => daysBetween(today, x.date) >= 0);
  const finished = plans.filter((x) => daysBetween(today, x.date) < 0).reverse();

  const candidates = upcomingEvents(data.anniversaries, data.profile).filter(
    (u) =>
      u.anniversaryId &&
      u.daysLeft <= 60 &&
      !data.celebrations.some((c) => c.anniversaryId === u.anniversaryId && c.year === u.date.getFullYear()),
  );

  const start = (a: Anniversary, year: number, daysLeft: number) => {
    const plan = buildPlan(a, year, daysLeft, newId(), newId);
    update((d) => ({ ...d, celebrations: [...d.celebrations, plan] }));
    navigate(`/celebrations/${plan.id}`);
  };

  const card = ({ p, a, date }: { p: CelebrationPlan; a: Anniversary; date: Date }) => {
    const { done, total } = planProgress(p);
    const left = daysBetween(today, date);
    return (
      <li key={p.id} className="card">
        <Link to={`/celebrations/${p.id}`} className="row plain">
          <span className="emoji">{a.kind === 'birthday' ? '🎂' : '💍'}</span>
          <div className="grow">
            <div className="todo-title">
              {a.title} {p.secret && <span className="tag secret">🤫 サプライズ</span>}
            </div>
            <div className="muted small">{formatJa(date)}</div>
            <div className="progress">
              <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <div className="muted small">
              準備 {done}/{total}
            </div>
          </div>
          {left >= 0 && <DaysBadge days={left} />}
        </Link>
      </li>
    );
  };

  return (
    <div className="stack">
      <PageHeader title="お祝いの準備" sub="誕生日・記念日に向けたプラン、プレゼント、やることリスト" />
      {candidates.length > 0 && (
        <section className="card highlight">
          <h2>⏰ もうすぐの記念日（60日以内）</h2>
          <ul className="list">
            {candidates.map((u) => (
              <li key={u.key} className="row">
                <span className="emoji">{u.emoji}</span>
                <div className="grow">
                  {u.title} <span className="muted small">{formatJa(u.date)}</span>
                </div>
                <DaysBadge days={u.daysLeft} />
                <button
                  className="btn small primary"
                  onClick={() => start(byId.get(u.anniversaryId!)!, u.date.getFullYear(), u.daysLeft)}
                >
                  準備を始める
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {active.length === 0 && candidates.length === 0 ? (
        <Empty>
          <Link to="/anniversaries">記念日一覧</Link>から「お祝い準備」を押すと、準備リストが作られます
        </Empty>
      ) : (
        <ul className="cards">{active.map(card)}</ul>
      )}
      {finished.length > 0 && (
        <>
          <h2 className="section-title">過去のお祝い</h2>
          <ul className="cards">{finished.map(card)}</ul>
        </>
      )}
    </div>
  );
}

function PlanDetail({ id }: { id: string }) {
  const { data, update, mode, hasPrivate } = useStore();
  const navigate = useNavigate();
  const plan = data.celebrations.find((c) => c.id === id);
  const anniversary = plan && data.anniversaries.find((a) => a.id === plan.anniversaryId);
  const [newTask, setNewTask] = useState('');
  const [gift, setGift] = useState({ name: '', price: '', url: '' });

  if (!plan || !anniversary) {
    return (
      <Empty>
        プランが見つかりません。<Link to="/celebrations">一覧に戻る</Link>
      </Empty>
    );
  }

  const date = planDate(anniversary, plan.year);
  const left = daysBetween(new Date(), date);
  const patch = (fn: (p: CelebrationPlan) => CelebrationPlan) =>
    update((d) => ({ ...d, celebrations: d.celebrations.map((c) => (c.id === id ? fn(c) : c)) }));
  const setField = <K extends keyof CelebrationPlan>(k: K, v: CelebrationPlan[K]) => patch((p) => ({ ...p, [k]: v }));

  const { done, total } = planProgress(plan);
  const chosenTotal = plan.gifts.filter((g) => g.chosen).reduce((s, g) => s + (g.price || 0), 0);

  const addTask = () => {
    if (!newTask.trim()) return;
    patch((p) => ({ ...p, tasks: [...p.tasks, { id: newId(), title: newTask.trim(), done: false }] }));
    setNewTask('');
  };
  const addGift = () => {
    if (!gift.name.trim()) return;
    const g: GiftIdea = { id: newId(), name: gift.name.trim(), price: Number(gift.price) || 0, url: gift.url, chosen: false };
    patch((p) => ({ ...p, gifts: [...p.gifts, g] }));
    setGift({ name: '', price: '', url: '' });
  };
  const removePlan = () => {
    update((d) => ({ ...d, celebrations: d.celebrations.filter((c) => c.id !== id) }));
    navigate('/celebrations');
  };

  return (
    <div className="stack">
      <Link to="/celebrations" className="back">
        ← お祝いの準備
      </Link>
      <PageHeader
        title={`${anniversary.kind === 'birthday' ? '🎂' : '💍'} ${anniversary.title}`}
        sub={`${formatJa(date)}　準備 ${done}/${total}`}
        action={left >= 0 ? <DaysBadge days={left} /> : <span className="badge">終了</span>}
      />

      <label className="check">
        <input type="checkbox" checked={plan.secret} onChange={(e) => setField('secret', e.target.checked)} />
        {mode === 'cloud' && hasPrivate
          ? '🤫 サプライズ（このプランは自分にだけ表示され、相手には見えません）'
          : '🤫 サプライズ（相手に見せないように注意）'}
      </label>

      <section className="card">
        <h2>✅ やることリスト</h2>
        <div className="progress">
          <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <ul className="list">
          {plan.tasks.map((t) => (
            <li key={t.id} className={`row ${t.done ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() =>
                  patch((p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))
                }
              />
              <span className="grow">{t.title}</span>
              <button
                className="icon-btn"
                aria-label="削除"
                onClick={() => patch((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== t.id) }))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
        >
          <input placeholder="やることを追加" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
          <button className="btn">追加</button>
        </form>
      </section>

      <section className="card">
        <h2>🎁 プレゼント候補</h2>
        <p className="muted small">
          予算 {plan.budget ? `¥${plan.budget.toLocaleString()}` : '未設定'}　/ 決定済み合計 ¥{chosenTotal.toLocaleString()}
          {plan.budget > 0 && chosenTotal > plan.budget && <span className="warn">　予算オーバー！</span>}
        </p>
        <ul className="list">
          {plan.gifts.map((g) => (
            <li key={g.id} className="row">
              <button
                className={`chip ${g.chosen ? 'on' : ''}`}
                onClick={() =>
                  patch((p) => ({ ...p, gifts: p.gifts.map((x) => (x.id === g.id ? { ...x, chosen: !x.chosen } : x)) }))
                }
              >
                {g.chosen ? '決定' : '候補'}
              </button>
              <span className="grow">
                {g.url ? (
                  <a href={g.url} target="_blank" rel="noreferrer">
                    {g.name}
                  </a>
                ) : (
                  g.name
                )}
              </span>
              {g.price > 0 && <span>¥{g.price.toLocaleString()}</span>}
              <button
                className="icon-btn"
                aria-label="削除"
                onClick={() => patch((p) => ({ ...p, gifts: p.gifts.filter((x) => x.id !== g.id) }))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form
          className="inline-form wrap"
          onSubmit={(e) => {
            e.preventDefault();
            addGift();
          }}
        >
          <input placeholder="プレゼント名" value={gift.name} onChange={(e) => setGift({ ...gift, name: e.target.value })} />
          <input
            type="number"
            min={0}
            placeholder="価格"
            className="narrow"
            value={gift.price}
            onChange={(e) => setGift({ ...gift, price: e.target.value })}
          />
          <input type="url" placeholder="URL" value={gift.url} onChange={(e) => setGift({ ...gift, url: e.target.value })} />
          <button className="btn">追加</button>
        </form>
      </section>

      <section className="card form">
        <h2>📝 プラン</h2>
        <Field label="予算（円）">
          <input
            type="number"
            min={0}
            value={plan.budget || ''}
            onChange={(e) => setField('budget', Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="予約（お店・宿など）">
          <input value={plan.reservation} onChange={(e) => setField('reservation', e.target.value)} />
        </Field>
        <Field label="当日の流れ・メモ">
          <textarea rows={5} value={plan.plan} onChange={(e) => setField('plan', e.target.value)} />
        </Field>
      </section>

      <ConfirmButton className="btn danger" confirmLabel="もう一度押すと削除します" onConfirm={removePlan}>
        このプランを削除
      </ConfirmButton>
    </div>
  );
}
