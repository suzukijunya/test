import { useState } from 'react';
import { useMe, useOwnerLabel, useStore } from '../store';
import type { GameAnswer, GameRound } from '../types';
import { newId } from '../lib/id';
import { formatJa, toDateString } from '../lib/dates';
import { withActivity } from '../lib/activity';
import { CATEGORIES, dailyQuestion, randomQuestion, type Category, type Question } from '../lib/questions';
import { answerId, guessResult, other, scoreOf, viewRound, type RoundView, type Who } from '../lib/game';
import { Empty, PageHeader } from '../components/ui';
import WhoPicker from '../components/WhoPicker';

function roundFrom(q: Question, daily: boolean, date: string): GameRound {
  return {
    id: daily ? `daily-${date}` : newId(),
    questionId: q.id,
    text: q.text,
    category: q.category,
    choices: q.choices ?? [],
    date,
    daily,
    createdAt: new Date().toISOString(),
  };
}

export default function GamePage() {
  const { data, update } = useStore();
  const me = useMe();
  const label = useOwnerLabel();
  const [category, setCategory] = useState<Category | ''>('');
  const today = toDateString(new Date());

  if (!me) {
    return (
      <div className="stack">
        <PageHeader title="ふたりの質問ゲーム" sub="お互いのことをどれだけ知ってる？" />
        <WhoPicker />
      </div>
    );
  }

  const todayRound = data.rounds.find((r) => r.id === `daily-${today}`) ?? roundFrom(dailyQuestion(today), true, today);
  const views = [...data.rounds]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((r) => r.id !== todayRound.id)
    .map((r) => viewRound(r, data.answers, me));
  const pending = views.filter((v) => v.phase !== 'revealed');
  const history = views.filter((v) => v.phase === 'revealed');
  const score = scoreOf(data.rounds, data.answers);

  const submit = (round: GameRound, self: string, guess: string) => {
    const a: GameAnswer = { id: answerId(round.id, me), roundId: round.id, who: me, self, guess, correct: null, at: new Date().toISOString() };
    update((d) => {
      const rounds = d.rounds.some((r) => r.id === round.id) ? d.rounds : [...d.rounds, round];
      const answers = [...d.answers.filter((x) => x.id !== a.id), a];
      return withActivity({ ...d, rounds, answers }, me, `質問「${round.text}」に答えました`, '/game');
    });
  };
  const judge = (round: GameRound, correct: boolean) => {
    // 相手の予想（相手の回答ドキュメント）に当たり/はずれを付ける
    const id = answerId(round.id, other(me));
    update((d) => ({ ...d, answers: d.answers.map((x) => (x.id === id ? { ...x, correct } : x)) }));
  };
  const newRound = () => {
    const q = randomQuestion(
      data.rounds.map((r) => r.questionId),
      category || undefined,
    );
    const r = roundFrom(q, false, today);
    update((d) => withActivity({ ...d, rounds: [...d.rounds, r] }, me, `新しい質問「${q.text}」を出しました`, '/game'));
  };

  const rate = score.comparable ? Math.round((score.same / score.comparable) * 100) : null;

  return (
    <div className="stack">
      <PageHeader title="ふたりの質問ゲーム" sub="自分の答えと、相手の答えの予想を入力。ふたりとも答えたら答え合わせ！" />

      <div className="score">
        <div className="score-item">
          <span className="small">{label('me')}の的中</span>
          <strong>{score.hits.me}</strong>
          <span className="muted small">/ {score.played}問</span>
        </div>
        <div className="score-item">
          <span className="small">{label('partner')}の的中</span>
          <strong>{score.hits.partner}</strong>
          <span className="muted small">/ {score.played}問</span>
        </div>
        <div className="score-item">
          <span className="small">答えの一致率</span>
          <strong>{rate === null ? '—' : `${rate}%`}</strong>
          <span className="muted small">選択式の問題</span>
        </div>
      </div>

      <section className="stack">
        <h2>☀️ 今日の質問</h2>
        <RoundCard view={viewRound(todayRound, data.answers, me)} me={me} onSubmit={submit} onJudge={judge} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>🎲 もう1問</h2>
        </div>
        <div className="toolbar">
          <select id="game-cat" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">ランダム</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="btn primary" onClick={newRound}>
            質問を出す
          </button>
        </div>
        <p className="muted small">出した質問は相手の画面にも表示されます。</p>
      </section>

      {pending.length > 0 && (
        <section className="stack">
          <h2>⏳ 回答待ち</h2>
          {pending.map((v) => (
            <RoundCard key={v.round.id} view={v} me={me} onSubmit={submit} onJudge={judge} />
          ))}
        </section>
      )}

      <section className="stack">
        <h2>📖 これまでの答え合わせ</h2>
        {history.length === 0 ? (
          <Empty>ふたりとも答えた質問がここに残ります</Empty>
        ) : (
          history.map((v) => <RoundCard key={v.round.id} view={v} me={me} onSubmit={submit} onJudge={judge} />)
        )}
      </section>
    </div>
  );
}

function RoundCard({
  view,
  me,
  onSubmit,
  onJudge,
}: {
  view: RoundView;
  me: Who;
  onSubmit: (r: GameRound, self: string, guess: string) => void;
  onJudge: (r: GameRound, correct: boolean) => void;
}) {
  const label = useOwnerLabel();
  const { round, mine, theirs, phase } = view;
  const [self, setSelf] = useState('');
  const [guess, setGuess] = useState('');
  const partner = label(other(me));
  const hasChoices = round.choices.length > 0;

  const input = (value: string, set: (v: string) => void, id: string, placeholder: string) =>
    hasChoices ? (
      <div className="q-choices" role="radiogroup">
        {round.choices.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            className={`q-choice ${value === c ? 'on' : ''}`}
            onClick={() => set(c)}
          >
            {c}
          </button>
        ))}
      </div>
    ) : (
      <input id={id} placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} />
    );

  const myResult = guessResult(mine, theirs, round);
  const theirResult = guessResult(theirs, mine, round);
  const mark = (r: boolean | null) => (r === null ? '判定待ち' : r ? '⭕ 当たり' : '❌ はずれ');

  return (
    <div className="q-card">
      <span className="tag q-cat">
        {round.daily ? `今日の質問・${formatJa(round.date)}` : round.category}
      </span>
      <p className="q-text">{round.text}</p>

      {phase === 'answer' && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (self.trim() && guess.trim()) onSubmit(round, self.trim(), guess.trim());
          }}
        >
          <div className="field">
            <span>あなたの答え</span>
            {input(self, setSelf, `self-${round.id}`, '自分の答え')}
          </div>
          <div className="field">
            <span>{partner}の答えを予想</span>
            {input(guess, setGuess, `guess-${round.id}`, `${partner}はなんて答える？`)}
          </div>
          <button className="btn primary" disabled={!self.trim() || !guess.trim()}>
            回答する
          </button>
          {theirs && <p className="muted small">{partner}はもう答えています。答えると答え合わせできます！</p>}
        </form>
      )}

      {phase === 'waiting' && mine && (
        <div className="stack">
          <div className="waiting">{partner}の回答を待っています…</div>
          <dl className="reveal-box" style={{ textAlign: 'left' }}>
            <dt>あなたの答え</dt>
            <dd>{mine.self}</dd>
            <dt>{partner}の答えの予想</dt>
            <dd>{mine.guess}</dd>
          </dl>
        </div>
      )}

      {phase === 'revealed' && mine && theirs && (
        <div className="reveal">
          <dl className="reveal-box">
            <dt>{label(me)}の答え</dt>
            <dd>{mine.self}</dd>
            <dt>{partner}の予想</dt>
            <dd>
              {theirs.guess} <span className="tag">{mark(theirResult)}</span>
            </dd>
            {theirResult === null && (
              <div className="row wrap">
                <span className="small">{partner}の予想は当たってた？</span>
                <button className="btn small primary" onClick={() => onJudge(round, true)}>
                  当たり
                </button>
                <button className="btn small" onClick={() => onJudge(round, false)}>
                  はずれ
                </button>
              </div>
            )}
          </dl>
          <dl className="reveal-box">
            <dt>{partner}の答え</dt>
            <dd>{theirs.self}</dd>
            <dt>{label(me)}の予想</dt>
            <dd>
              {mine.guess} <span className="tag">{mark(myResult)}</span>
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
