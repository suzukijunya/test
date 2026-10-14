import { Link } from 'react-router-dom';
import { useMe, useOwnerLabel, useStore } from '../store';
import WhoPicker from '../components/WhoPicker';
import { timeAgo } from '../lib/activity';
import { dailyQuestion } from '../lib/questions';
import { viewRound } from '../lib/game';
import { daysTogether, formatJa, toDateString } from '../lib/dates';
import { upcomingEvents } from '../lib/upcoming';
import { DaysBadge, Empty } from '../components/ui';
import { VLOG_STATUS } from './VlogsPage';

export default function Home() {
  const { data } = useStore();
  const me = useMe();
  const label = useOwnerLabel();
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

  const todayQ = dailyQuestion(todayStr);
  const todayRound = data.rounds.find((r) => r.id === `daily-${todayStr}`);
  const todayPhase = me && todayRound ? viewRound(todayRound, data.answers, me).phase : 'answer';
  const feed = [...data.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <div className="stack">
      {!me && <WhoPicker />}
      <section className="hero card">
        {profile.myName || profile.partnerName ? (
          <p className="hero-names">
            {profile.myName || 'ひとり目'} <span className="heart">♡</span> {profile.partnerName || 'ふたり目'}
          </p>
        ) : (
          <p className="hero-names">nyasuへようこそ</p>
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

      <section className="card highlight">
        <div className="card-head">
          <h2>💭 今日の質問</h2>
          <Link to="/game">
            {todayPhase === 'answer' ? '答える' : todayPhase === 'waiting' ? '相手の回答待ち' : '答え合わせを見る'}
          </Link>
        </div>
        <p className="q-text" style={{ textAlign: 'left', fontSize: '1.05rem' }}>
          {todayRound?.text ?? todayQ.text}
        </p>
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
          <h2>🔔 最近の更新</h2>
        </div>
        {feed.length === 0 ? (
          <Empty>予定の追加やコメント、ゲームの回答などがここに表示されます</Empty>
        ) : (
          <ul className="feed">
            {feed.map((a) => (
              <li key={a.id}>
                <span className="who">{label(a.who)}</span>
                <Link to={a.link} className="grow" style={{ textDecoration: 'none' }}>
                  {a.text}
                </Link>
                <span className="when">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
