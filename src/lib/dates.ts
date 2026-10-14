const DAY = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD をローカルタイムの0時として解釈 */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

/** 2/29 生まれは平年では 2/28 扱い */
export function sameDayInYear(base: Date, year: number): Date {
  const month = base.getMonth();
  const day = base.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * 今日以降で次に来る日付を返す（当日を含む）。
 * yearly=false の場合は起点日そのもの（過ぎていれば null）。
 */
export function nextOccurrence(dateStr: string, yearly: boolean, today = new Date()): Date | null {
  const base = parseDate(dateStr);
  const t = startOfDay(today);
  if (!yearly) return base >= t ? base : null;
  let candidate = sameDayInYear(base, t.getFullYear());
  if (candidate < t) candidate = sameDayInYear(base, t.getFullYear() + 1);
  return candidate;
}

/** 次の発生日が起点から何年目か（誕生日なら年齢、記念日なら周年） */
export function yearsAt(dateStr: string, occurrence: Date): number {
  return occurrence.getFullYear() - parseDate(dateStr).getFullYear();
}

/** 付き合ってからの日数（初日を1日目とする） */
export function daysTogether(startDate: string, today = new Date()): number {
  return daysBetween(parseDate(startDate), today) + 1;
}

export function formatJa(d: Date | string): string {
  const date = typeof d === 'string' ? parseDate(d) : d;
  const w = '日月火水木金土'[date.getDay()];
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}(${w})`;
}

/** 付き合ってN日目の節目（100日ごと）で次に来るものを返す */
export function nextMilestone(startDate: string, today = new Date()): { days: number; date: Date } | null {
  if (!startDate) return null;
  const current = daysTogether(startDate, today);
  const target = Math.max(100, Math.ceil(current / 100) * 100);
  const date = new Date(parseDate(startDate).getTime());
  date.setDate(date.getDate() + target - 1);
  return { days: target, date };
}
