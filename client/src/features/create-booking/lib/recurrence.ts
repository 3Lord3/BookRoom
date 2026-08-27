import type { Interval } from '@shared/lib/dates';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Серия из count интервалов с шагом в неделю; арифметика в UTC-мгновениях,
// поэтому сдвиг не зависит от таймзон
export function buildOccurrenceSeries(base: Interval, count: number): Interval[] {
  const from = new Date(base.from).getTime();
  const to = new Date(base.to).getTime();
  return Array.from({ length: count }, (_, index) => {
    const offset = index * WEEK_MS;
    return {
      from: new Date(from + offset).toISOString(),
      to: new Date(to + offset).toISOString(),
    };
  });
}