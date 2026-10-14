import { describe, expect, it } from 'vitest';
import { diffDocs, fromDocs, toDocs } from './cloudSync';
import { createEmptyData } from '../store';
import type { CelebrationPlan } from '../types';

const plan = (id: string, secret: boolean): CelebrationPlan => ({
  id, anniversaryId: 'a', year: 2026, budget: 0, plan: '', reservation: '', tasks: [], gifts: [], secret,
});

describe('cloudSync', () => {
  it('サプライズは自分専用の領域に保存し、往復で元に戻る', () => {
    const d = { ...createEmptyData(), celebrations: [plan('p1', false), plan('p2', true)] };
    const docs = toDocs(d, 'u1');
    expect(Object.keys(docs).sort()).toEqual(['celebrations/p1', 'data/users/u1/cel_p2', 'meta/profile']);
    const back = fromDocs(docs, createEmptyData(), 'u1');
    expect(back.celebrations.map((c) => c.id).sort()).toEqual(['p1', 'p2']);
  });
  it('相手の非公開領域は読み込まない', () => {
    const docs = toDocs({ ...createEmptyData(), celebrations: [plan('p2', true)] }, 'u1');
    expect(fromDocs(docs, createEmptyData(), 'u2').celebrations).toEqual([]);
  });
  it('差分', () => {
    const a = { 'todos/1': { t: 1 }, 'todos/2': { t: 2 } };
    const b = { 'todos/1': { t: 1 }, 'todos/2': { t: 3 }, 'todos/3': { t: 1 } };
    expect(diffDocs(a, b)).toEqual({ set: ['todos/2', 'todos/3'], remove: [] });
    expect(diffDocs(b, a)).toEqual({ set: ['todos/2'], remove: ['todos/3'] });
  });
});
