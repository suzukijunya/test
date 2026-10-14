import { describe, expect, it } from 'vitest';
import { coinBalance, earnedCoins, isPlaced, rankOf } from './room';
import { createEmptyData } from '../store';

describe('おへや', () => {
  it('はじめは100コイン、活動で増え、買うと減る', () => {
    const d = createEmptyData();
    expect(earnedCoins(d)).toBe(100);
    const d2 = {
      ...d,
      events: [{ id: 'e', title: 'x', date: '2026-10-14', startTime: '', endTime: '', location: '', memo: '', owner: 'both' as const }],
      decor: [{ id: 'plant', placed: true, boughtBy: 'me' as const, boughtAt: '' }],
    };
    expect(earnedCoins(d2)).toBe(105);
    expect(coinBalance(d2)).toBe(45);
  });
  it('ランク', () => {
    expect(rankOf(100)).toEqual({ rank: 1, progress: 0, step: 100 });
    expect(rankOf(260)).toEqual({ rank: 2, progress: 60, step: 100 });
  });
  it('マグは最初から飾ってある', () => {
    const d = createEmptyData();
    expect(isPlaced(d, 'mugs')).toBe(true);
    expect(isPlaced({ ...d, decor: [{ id: 'mugs', placed: false, boughtBy: 'me', boughtAt: '' }] }, 'mugs')).toBe(false);
  });
});
