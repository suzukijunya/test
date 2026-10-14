import type { Anniversary, CelebrationPlan, Profile } from '../types';
import { daysBetween, nextMilestone, nextOccurrence, yearsAt } from './dates';

export interface UpcomingEvent {
  key: string;
  anniversaryId?: string;
  emoji: string;
  title: string;
  /** 「25歳」「3周年」など */
  label: string;
  date: Date;
  daysLeft: number;
}

const EMOJI: Record<Anniversary['kind'], string> = { birthday: '🎂', anniversary: '💍', other: '⭐' };

export function upcomingEvents(
  anniversaries: Anniversary[],
  profile: Profile,
  today = new Date(),
): UpcomingEvent[] {
  const list: UpcomingEvent[] = [];
  for (const a of anniversaries) {
    if (!a.date) continue;
    const occ = nextOccurrence(a.date, a.yearly, today);
    if (!occ) continue;
    const n = yearsAt(a.date, occ);
    let label = '';
    if (a.yearly && n > 0) label = a.kind === 'birthday' ? `${n}歳` : `${n}周年`;
    list.push({
      key: `${a.id}:${occ.getFullYear()}`,
      anniversaryId: a.id,
      emoji: EMOJI[a.kind],
      title: a.title,
      label,
      date: occ,
      daysLeft: daysBetween(today, occ),
    });
  }
  if (profile.startDate) {
    const m = nextMilestone(profile.startDate, today);
    if (m) {
      list.push({
        key: `milestone:${m.days}`,
        emoji: '💕',
        title: `付き合って${m.days}日`,
        label: '',
        date: m.date,
        daysLeft: daysBetween(today, m.date),
      });
    }
  }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function planProgress(p: CelebrationPlan): { done: number; total: number } {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.done).length;
  return { done, total };
}

/** 記念日に向けた準備のテンプレート */
export function defaultPrepTasks(kind: Anniversary['kind'], daysLeft: number): string[] {
  const base =
    kind === 'birthday'
      ? ['プレゼントを決める', 'プレゼントを購入・注文', 'お店を予約', 'ケーキを予約', 'メッセージカードを書く', '当日の流れを決める']
      : ['どう過ごすか決める', 'お店・宿を予約', 'プレゼントを用意', '手紙を書く', '写真・Vlogの撮影準備'];
  // 直前なら予約系を先頭に
  return daysLeft < 14 ? [...base].sort((a) => (a.includes('予約') ? -1 : 1)) : base;
}

export function buildPlan(a: Anniversary, year: number, daysLeft: number, id: string, taskIds: () => string): CelebrationPlan {
  return {
    id,
    anniversaryId: a.id,
    year,
    budget: 0,
    plan: '',
    reservation: '',
    tasks: defaultPrepTasks(a.kind, daysLeft).map((title) => ({ id: taskIds(), title, done: false })),
    gifts: [],
    secret: a.kind === 'birthday',
  };
}
