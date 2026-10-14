import { describe, expect, it } from 'vitest';
import { daysTogether, nextMilestone, nextOccurrence, toDateString, yearsAt } from './dates';
import { youtubeId } from './youtube';
import { buildEventBody } from './googleCalendar';
import { upcomingEvents } from './upcoming';

const d = (s: string) => {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
};

describe('nextOccurrence', () => {
  it('今年まだ来ていなければ今年', () => {
    expect(toDateString(nextOccurrence('1995-12-24', true, d('2026-10-14'))!)).toBe('2026-12-24');
  });
  it('今年過ぎていれば来年', () => {
    expect(toDateString(nextOccurrence('1995-03-01', true, d('2026-10-14'))!)).toBe('2027-03-01');
  });
  it('当日は当日', () => {
    expect(toDateString(nextOccurrence('2020-10-14', true, d('2026-10-14'))!)).toBe('2026-10-14');
  });
  it('2/29 は平年では 2/28', () => {
    expect(toDateString(nextOccurrence('2000-02-29', true, d('2026-10-14'))!)).toBe('2027-02-28');
    expect(toDateString(nextOccurrence('2000-02-29', true, d('2027-10-14'))!)).toBe('2028-02-29');
  });
  it('繰り返さない日は過ぎたら null', () => {
    expect(nextOccurrence('2026-01-01', false, d('2026-10-14'))).toBeNull();
    expect(toDateString(nextOccurrence('2026-12-01', false, d('2026-10-14'))!)).toBe('2026-12-01');
  });
});

describe('付き合ってからの日数', () => {
  it('初日は1日目', () => {
    expect(daysTogether('2026-10-14', d('2026-10-14'))).toBe(1);
    expect(daysTogether('2026-01-01', d('2026-12-31'))).toBe(365);
  });
  it('次の100日単位の節目', () => {
    const m = nextMilestone('2026-01-01', d('2026-03-01'))!;
    expect(m.days).toBe(100);
    expect(toDateString(m.date)).toBe('2026-04-10');
    expect(nextMilestone('2026-01-01', d('2026-04-10'))!.days).toBe(100);
    expect(nextMilestone('2026-01-01', d('2026-04-11'))!.days).toBe(200);
  });
  it('年数', () => {
    expect(yearsAt('2000-05-05', d('2026-05-05'))).toBe(26);
  });
});

describe('upcomingEvents', () => {
  it('近い順・年齢ラベル付き', () => {
    const list = upcomingEvents(
      [
        { id: 'a', kind: 'birthday', title: 'はなの誕生日', date: '1998-11-03', yearly: true, person: 'partner', memo: '' },
        { id: 'b', kind: 'anniversary', title: '記念日', date: '2023-10-20', yearly: true, person: 'both', memo: '' },
      ],
      { myName: '', partnerName: '', startDate: '' },
      d('2026-10-14'),
    );
    expect(list.map((x) => [x.title, x.label, x.daysLeft])).toEqual([
      ['記念日', '3周年', 6],
      ['はなの誕生日', '28歳', 20],
    ]);
  });
});

describe('youtubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc123', 'abc123'],
    ['https://youtu.be/abc123?t=10', 'abc123'],
    ['https://youtube.com/shorts/xyz', 'xyz'],
    ['https://example.com/video', null],
    ['not a url', null],
  ])('%s', (url, id) => expect(youtubeId(url)).toBe(id));
});

describe('buildEventBody', () => {
  it('終日イベントは翌日を end にする', () => {
    const b = buildEventBody({ summary: 'x', date: '2026-12-31', yearly: true }, 'Asia/Tokyo');
    expect(b.start).toEqual({ date: '2026-12-31' });
    expect(b.end).toEqual({ date: '2027-01-01' });
    expect(b.recurrence).toEqual(['RRULE:FREQ=YEARLY']);
  });
  it('時間指定イベント', () => {
    const b = buildEventBody({ summary: 'x', date: '2026-10-14', startTime: '18:00', endTime: '20:00' }, 'Asia/Tokyo');
    expect(b.start).toEqual({ dateTime: '2026-10-14T18:00:00', timeZone: 'Asia/Tokyo' });
    expect(b.end).toEqual({ dateTime: '2026-10-14T20:00:00', timeZone: 'Asia/Tokyo' });
  });
});
