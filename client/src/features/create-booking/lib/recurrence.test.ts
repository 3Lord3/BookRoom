import { describe, expect, it } from 'vitest';

import { buildOccurrenceSeries } from './recurrence';

const BASE = { from: '2026-08-24T07:00:00.000Z', to: '2026-08-24T08:00:00.000Z' };

describe('buildOccurrenceSeries', () => {
  it('строит count вхождений, каждое на неделю позже с тем же временем суток', () => {
    expect(buildOccurrenceSeries(BASE, 3)).toEqual([
      BASE,
      { from: '2026-08-31T07:00:00.000Z', to: '2026-08-31T08:00:00.000Z' },
      { from: '2026-09-07T07:00:00.000Z', to: '2026-09-07T08:00:00.000Z' },
    ]);
  });

  it('при count=1 возвращает только базовый интервал', () => {
    expect(buildOccurrenceSeries(BASE, 1)).toEqual([BASE]);
  });

  it('длительность каждого вхождения совпадает с базовой', () => {
    const series = buildOccurrenceSeries(BASE, 4);
    const duration = (isoToMs: string) => Number(new Date(isoToMs));
    const baseMs = duration(BASE.to) - duration(BASE.from);
    for (const interval of series) {
      expect(duration(interval.to) - duration(interval.from)).toBe(baseMs);
    }
  });
});