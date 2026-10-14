import { describe, expect, it } from 'vitest';
import { guessResult, scoreOf, viewRound } from './game';
import { dailyQuestion, looselyEqual, QUESTIONS } from './questions';
import type { GameAnswer, GameRound } from '../types';

const round = (id: string, choices: string[] = []): GameRound => ({
  id, questionId: 'x', text: 'q', category: 'c', choices, date: '2026-10-14', daily: false, createdAt: '',
});
const ans = (roundId: string, who: 'me' | 'partner', self: string, guess: string, correct: boolean | null = null): GameAnswer => ({
  id: `${roundId}_${who}`, roundId, who, self, guess, correct, at: '',
});

describe('質問ゲーム', () => {
  it('今日の質問は日付で決まる', () => {
    expect(dailyQuestion('2026-10-14')).toBe(dailyQuestion('2026-10-14'));
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
  it('ゆるい一致', () => {
    expect(looselyEqual('ラーメン！', 'ラーメン')).toBe(true);
    expect(looselyEqual('お 寿司', 'お寿司')).toBe(true);
    expect(looselyEqual('', '')).toBe(false);
  });
  it('両方答えるまで公開しない', () => {
    const r = round('r1');
    expect(viewRound(r, [], 'me').phase).toBe('answer');
    expect(viewRound(r, [ans('r1', 'me', 'a', 'b')], 'me').phase).toBe('waiting');
    expect(viewRound(r, [ans('r1', 'me', 'a', 'b'), ans('r1', 'partner', 'b', 'a')], 'partner').phase).toBe('revealed');
  });
  it('判定: 選択肢は自動、自由回答は判定待ち', () => {
    const c = round('r', ['犬', '猫']);
    expect(guessResult(ans('r', 'me', '犬', '猫'), ans('r', 'partner', '犬', '犬'), c)).toBe(false);
    const f = round('f');
    expect(guessResult(ans('f', 'me', 'x', 'カレー'), ans('f', 'partner', 'ハンバーグ', 'y'), f)).toBeNull();
    expect(guessResult(ans('f', 'me', 'x', 'カレー', true), ans('f', 'partner', 'ハンバーグ', 'y'), f)).toBe(true);
  });
  it('スコア', () => {
    const r1 = round('r1', ['犬', '猫']);
    const r2 = round('r2');
    const s = scoreOf(
      [r1, r2, round('r3')],
      [
        ans('r1', 'me', '犬', '犬'), ans('r1', 'partner', '犬', '猫'),
        ans('r2', 'me', 'カレー', 'すし', true), ans('r2', 'partner', 'すし', 'うどん', false),
        ans('r3', 'me', 'a', 'b'),
      ],
    );
    expect(s).toEqual({ played: 2, hits: { me: 2, partner: 0 }, same: 1, comparable: 1 });
  });
});
