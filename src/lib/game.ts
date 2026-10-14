import type { GameAnswer, GameRound } from '../types';
import { looselyEqual } from './questions';

export type Who = 'me' | 'partner';
export const other = (w: Who): Who => (w === 'me' ? 'partner' : 'me');

export type Phase = 'answer' | 'waiting' | 'revealed';

export interface RoundView {
  round: GameRound;
  mine?: GameAnswer;
  theirs?: GameAnswer;
  phase: Phase;
}

export function answerId(roundId: string, who: Who) {
  return `${roundId}_${who}`;
}

export function viewRound(round: GameRound, answers: GameAnswer[], me: Who): RoundView {
  const mine = answers.find((a) => a.id === answerId(round.id, me));
  const theirs = answers.find((a) => a.id === answerId(round.id, other(me)));
  const phase: Phase = !mine ? 'answer' : !theirs ? 'waiting' : 'revealed';
  return { round, mine, theirs, phase };
}

/**
 * ある人の予想が当たったか。
 * 判定済みならその結果、一致していれば自動で当たり、選択肢問題で不一致ならはずれ、自由回答は判定待ち(null)。
 */
export function guessResult(guesser: GameAnswer | undefined, target: GameAnswer | undefined, round: GameRound): boolean | null {
  if (!guesser || !target) return null;
  if (guesser.correct !== null) return guesser.correct;
  if (looselyEqual(guesser.guess, target.self)) return true;
  return round.choices.length ? false : null;
}

export interface Score {
  played: number;
  hits: Record<Who, number>;
  /** 自分の答えが同じだった数（価値観の一致） */
  same: number;
  /** 一致を比べられた問題数（選択肢問題） */
  comparable: number;
}

export function scoreOf(rounds: GameRound[], answers: GameAnswer[]): Score {
  const s: Score = { played: 0, hits: { me: 0, partner: 0 }, same: 0, comparable: 0 };
  for (const r of rounds) {
    const a = answers.find((x) => x.id === answerId(r.id, 'me'));
    const b = answers.find((x) => x.id === answerId(r.id, 'partner'));
    if (!a || !b) continue;
    s.played++;
    if (guessResult(a, b, r)) s.hits.me++;
    if (guessResult(b, a, r)) s.hits.partner++;
    if (r.choices.length) {
      s.comparable++;
      if (looselyEqual(a.self, b.self)) s.same++;
    }
  }
  return s;
}
