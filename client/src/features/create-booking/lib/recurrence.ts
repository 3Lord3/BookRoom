import type { Interval } from '@shared/lib/dates';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Серия одинаковых интервалов с шагом в неделю: от базового, count вхождений.
 * Арифметика в UTC-мгновениях, поэтому сдвиг на 7 дней не зависит от таймзон.
 */
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