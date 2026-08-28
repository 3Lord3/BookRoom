import { describe, expect, it } from 'vitest';

import { buildOccurrenceSeries } from './recurrence';

const TZ = 'Europe/Moscow';

const BASE = { from: '2026-08-24T07:00:00.000Z', to: '2026-08-24T08:00:00.000Z' };

describe('buildOccurrenceSeries', () => {
  it('weekly строит count вхождений, каждое на неделю позже с тем же временем суток', () => {
    expect(buildOccurrenceSeries(BASE, 3, 'weekly', TZ)).toEqual([
      BASE,
      { from: '2026-08-31T07:00:00.000Z', to: '2026-08-31T08:00:00.000Z' },
      { from: '2026-09-07T07:00:00.000Z', to: '2026-09-07T08:00:00.000Z' },
    ]);
  });

  it('daily сдвигает каждое вхождение на один день', () => {
    expect(buildOccurrenceSeries(BASE, 3, 'daily', TZ)).toEqual([
      BASE,
      { from: '2026-08-25T07:00:00.000Z', to: '2026-08-25T08:00:00.000Z' },
      { from: '2026-08-26T07:00:00.000Z', to: '2026-08-26T08:00:00.000Z' },
    ]);
  });

  it('weekdays пропускает выходные и продолжает в понедельник', () => {
    const friday = { from: '2026-08-28T07:00:00.000Z', to: '2026-08-28T08:00:00.000Z' };
    expect(buildOccurrenceSeries(friday, 3, 'weekdays', TZ)).toEqual([
      friday,
      { from: '2026-08-31T07:00:00.000Z', to: '2026-08-31T08:00:00.000Z' },
      { from: '2026-09-01T07:00:00.000Z', to: '2026-09-01T08:00:00.000Z' },
    ]);
  });

  it('не сдвигает время встречи через переход на летнее время', () => {
    // 09:00 CET 27 марта, через день после перехода 29 марта — снова 09:00 CEST
    const before = { from: '2026-03-27T08:00:00.000Z', to: '2026-03-27T09:00:00.000Z' };
    const series = buildOccurrenceSeries(before, 3, 'daily', 'Europe/Berlin');
    expect(series[1]?.from).toBe('2026-03-28T08:00:00.000Z');
    expect(series[2]?.from).toBe('2026-03-29T07:00:00.000Z');
  });

  it('при count=1 возвращает только базовый интервал', () => {
    expect(buildOccurrenceSeries(BASE, 1, 'weekly', TZ)).toEqual([BASE]);
  });

  it('длительность каждого вхождения совпадает с базовой', () => {
    const series = buildOccurrenceSeries(BASE, 4, 'weekdays', TZ);
    const duration = (isoToMs: string) => Number(new Date(isoToMs));
    const baseMs = duration(BASE.to) - duration(BASE.from);
    for (const interval of series) {
      expect(duration(interval.to) - duration(interval.from)).toBe(baseMs);
    }
  });
});
