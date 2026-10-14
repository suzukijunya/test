import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { daysTogether, formatJa, toDateString } from '../lib/dates';
import { upcomingEvents } from '../lib/upcoming';
import { DaysBadge, Empty } from '../components/ui';
import { VLOG_STATUS } from './VlogsPage';

export default function Home() {
  const { data } = useStore();
  const { profile } = data;
  const upcoming = upcomingEvents(data.anniversaries, profile).slice(0, 4);
  const openTodos = data.todos.filter((t) => !t.done);
  const places = openTodos.filter((t) => t.kind === 'place');
  const tasks = openTodos.filter((t) => t.kind === 'task');
  const inProgressVlogs = data.vlogs.filter((v) => v.status !== 'published');
  const todayStr = toDateString(new Date());
  const nextEvents = data.events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 4);

  return (
    <div className="stack">
      <section className="hero card">
        {profile.myName || profile.partnerName ? (
          <p className="hero-names">
            {profile.myName || '自分'} <span className="heart">♥</span> {profile.partnerName || '相手'}
          </p>
        ) : (
          <p className="hero-names">ふたりノートへようこそ</p>
        )}
        {profile.startDate ? (
          <p className="hero-days">
            付き合って <strong>{daysTogether(profile.startDate).toLocaleString()}</strong> 日目
          </p>
        ) : (
          <p className="muted">
            <Link to="/settings">設定</Link>で名前と付き合った日を登録しましょう
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>🎉 近づいている記念日</h2>
          <Link to="/anniversaries">すべて見る</Link>
        </div>
        {upcoming.length === 0 ? (
          <Empty>誕生日や記念日を登録すると、ここにカウントダウンが表示されます</Empty>
        ) : (
          <ul className="list">
            {upcoming.map((u) => {
              const plan = data.celebrations.find(
                (c) => c.anniversaryId === u.anniversaryId && c.year === u.date.getFullYear(),
              );
              return (
                <li key={u.key} className="row">
                  <span className="emoji">{u.emoji}</span>
                  <div className="grow">
                    <div>
                      {u.title} {u.label && <span className="muted">（{u.label}）</span>}
                    </div>
                    <div className="muted small">{formatJa(u.date)}</div>
                  </div>
                  <DaysBadge days={u.daysLeft} />
                  {u.anniversaryId && (
                    <Link className="btn small" to={plan ? `/celebrations/${plan.id}` : '/celebrations'}>
                      {plan ? '準備' : '準備する'}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>📅 これからの予定</h2>
          <Link to="/calendar">カレンダー</Link>
        </div>
        {nextEvents.length === 0 ? (
          <Empty>デートや旅行の予定をカレンダーに追加しましょう</Empty>
        ) : (
          <ul className="list compact">
            {nextEvents.map((e) => (
              <li key={e.id} className="row">
                <span className="muted small time-wide">
                  {formatJa(e.date)} {e.startTime}
                </span>
                <span className="grow">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>🍽 行きたいお店</h2>
            <Link to="/todos?tab=place">{places.length}件</Link>
          </div>
          {places.length === 0 ? (
            <Empty>まだありません</Empty>
          ) : (
            <ul className="list compact">
              {places.slice(0, 5).map((p) => (
                <li key={p.id}>
                  {p.title} {p.category && <span className="tag">{p.category}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>✅ ふたりのタスク</h2>
            <Link to="/todos?tab=task">{tasks.length}件</Link>
          </div>
          {tasks.length === 0 ? (
            <Empty>まだありません</Empty>
          ) : (
            <ul className="list compact">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  {t.title} {t.dueDate && <span className="muted small">〜{formatJa(t.dueDate)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>🎬 制作中のVlog</h2>
          <Link to="/vlogs">すべて見る</Link>
        </div>
        {inProgressVlogs.length === 0 ? (
          <Empty>制作中のVlogはありません</Empty>
        ) : (
          <ul className="list compact">
            {inProgressVlogs.slice(0, 5).map((v) => (
              <li key={v.id}>
                <span className={`status status-${v.status}`}>{VLOG_STATUS[v.status]}</span> {v.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
