/**
 * ふたりのおへや: 活動するとコインがたまり、飾りを買って部屋に飾れる。
 * コインは保存せず、ふたりのデータから毎回計算する（同時に操作しても数がずれない）。
 */
import type { AppData } from '../types';
import { guessResult } from './game';

export interface DecorItem {
  id: string;
  name: string;
  price: number;
}

/** 飾りのカタログ（イラストは components/art/Decor.tsx） */
export const DECOR: DecorItem[] = [
  { id: 'mugs', name: 'おそろいマグ', price: 0 },
  { id: 'plant', name: 'ゆれる観葉植物', price: 60 },
  { id: 'lamp', name: 'ラタンのランプ', price: 80 },
  { id: 'rug', name: 'まるいラグ', price: 80 },
  { id: 'frame', name: 'ふたりの写真', price: 100 },
  { id: 'cushion', name: 'ネコのクッション', price: 100 },
  { id: 'shelf', name: 'カップの棚', price: 120 },
  { id: 'cake', name: '記念日ケーキ', price: 120 },
  { id: 'lights', name: 'ガーランド', price: 150 },
  { id: 'curtain', name: 'レースのカーテン', price: 150 },
  { id: 'flowers', name: 'ひと束のお花', price: 180 },
  { id: 'tower', name: 'キャットタワー', price: 250 },
];

export const COIN_RULES = [
  { label: 'はじめてのごほうび', coins: 100 },
  { label: 'やりたいことを完了・お店に行った', coins: 10 },
  { label: '予定を追加', coins: 5 },
  { label: 'メモを書く', coins: 5 },
  { label: 'コメントする', coins: 2 },
  { label: '記念日を登録', coins: 10 },
  { label: '質問ゲームに答える', coins: 10 },
  { label: '相手の答えを当てる', coins: 10 },
  { label: 'Vlogを公開', coins: 30 },
] as const;

export function earnedCoins(d: AppData): number {
  let c = 100;
  c += d.todos.filter((t) => t.done).length * 10;
  c += d.events.length * 5;
  c += d.memos.length * 5;
  c += d.comments.length * 2;
  c += d.anniversaries.length * 10;
  c += d.answers.length * 10;
  for (const a of d.answers) {
    const round = d.rounds.find((r) => r.id === a.roundId);
    const target = d.answers.find((x) => x.roundId === a.roundId && x.who !== a.who);
    if (round && guessResult(a, target, round)) c += 10;
  }
  c += d.vlogs.filter((v) => v.status === 'published').length * 30;
  return c;
}

export function spentCoins(d: AppData): number {
  return d.decor.reduce((s, x) => s + (DECOR.find((i) => i.id === x.id)?.price ?? 0), 0);
}

export function coinBalance(d: AppData): number {
  return Math.max(0, earnedCoins(d) - spentCoins(d));
}

/** 100コインごとにランクアップ（はじめのごほうび100コインでランク1）。次のランクまでの進み具合も返す */
export function rankOf(earned: number): { rank: number; progress: number; step: number } {
  const step = 100;
  return { rank: Math.max(1, Math.floor(earned / step)), progress: earned % step, step };
}

export function isOwned(d: AppData, id: string) {
  return id === 'mugs' || d.decor.some((x) => x.id === id);
}

export function isPlaced(d: AppData, id: string) {
  const s = d.decor.find((x) => x.id === id);
  // おそろいマグは最初から持っていて飾ってある
  return s ? s.placed : id === 'mugs';
}
