import type { Activity, AppData, Owner } from '../types';
import { newId } from './id';

const MAX_ACTIVITY = 40;

/** 更新履歴を1件追加する（古いものは削除してクラウドの件数を抑える） */
export function withActivity(d: AppData, who: Owner | null, text: string, link = '/'): AppData {
  const item: Activity = { id: newId(), who: who ?? 'both', text, at: new Date().toISOString(), link };
  const sorted = [...d.activity, item].sort((a, b) => a.at.localeCompare(b.at));
  return { ...d, activity: sorted.slice(-MAX_ACTIVITY) };
}

export function timeAgo(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'たった今';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
