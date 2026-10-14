import { describe, expect, it } from 'vitest';
import { buildListArgs, extractEvents, mergeGoogleEvents } from './googleSync';
import type { CalendarEntry } from '../types';

describe('Googleカレンダー同期', () => {
  const from = new Date('2026-10-07T00:00:00Z');
  const to = new Date('2026-12-13T00:00:00Z');

  it('スキーマの引数名に合わせる', () => {
    expect(buildListArgs({ properties: { timeMin: {}, timeMax: {}, maxResults: {} } }, from, to)).toEqual({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      maxResults: 250,
    });
    expect(Object.keys(buildListArgs({ properties: { start_time: {}, end_time: {} } }, from, to))).toEqual(['start_time', 'end_time']);
    expect(buildListArgs(null, from, to)).toHaveProperty('time_min');
  });

  it('いろいろな返り値の形を読む', () => {
    const google = {
      items: [
        { id: 'a1', summary: '歯医者', start: { dateTime: '2026-10-20T10:00:00+09:00' }, end: { dateTime: '2026-10-20T11:00:00+09:00' } },
        { id: 'a2', summary: '旅行', start: { date: '2026-11-01' }, end: { date: '2026-11-03' } },
        { id: 'a3', summary: '中止', status: 'cancelled', start: { date: '2026-11-05' } },
      ],
    };
    const ev = extractEvents(google);
    expect(ev.map((e) => [e.title, e.date, e.startTime === '' ? '終日' : 'time'])).toEqual([
      ['歯医者', '2026-10-20', 'time'],
      ['旅行', '2026-11-01', '終日'],
    ]);
    const flat = extractEvents(JSON.stringify({ events: [{ event_id: 'x', title: '会議', start_time: '2026-10-21' }] }));
    expect(flat[0]).toMatchObject({ googleId: 'x', title: '会議', date: '2026-10-21', startTime: '' });
    expect(extractEvents('予定はありません')).toEqual([]);
  });

  it('同期範囲の自分のGoogle予定だけ入れ替え、相手やアプリの予定は残す', () => {
    const base = { startTime: '', endTime: '', location: '', memo: '' };
    const current: CalendarEntry[] = [
      { ...base, id: 'app', title: 'デート', date: '2026-10-25', owner: 'both' },
      { ...base, id: 'old', title: '消えた予定', date: '2026-10-26', owner: 'me', source: 'google', googleId: 'z' },
      { ...base, id: 'past', title: '昔', date: '2026-01-01', owner: 'me', source: 'google', googleId: 'p' },
      { ...base, id: 'hers', title: 'あすか', date: '2026-10-26', owner: 'partner', source: 'google', googleId: 'h' },
    ];
    const next = mergeGoogleEvents(
      current,
      [{ googleId: 'n1', title: '歯医者', date: '2026-10-20', startTime: '10:00', endTime: '11:00', location: '駅前' }],
      'me',
      { from: '2026-10-07', to: '2026-12-13' },
      true,
    );
    expect(next.map((e) => e.title).sort()).toEqual(['あすか', 'デート', '予定あり', '昔']);
    expect(next.find((e) => e.title === '予定あり')?.location).toBe('');
  });
});
