import { TZDate } from '@date-fns/tz';

export interface Interval {
  /** ISO 8601 в UTC — формат, который ждёт бэкенд */
  from: string;
  to: string;
}

const toUtcIso = (date: TZDate): string => new Date(date.getTime()).toISOString();

/**
 * Интервал [начало, +длительность) в таймзоне офиса. Арифметика ведётся в минутах,
 * TZDate сам нормализует переполнение (например, минуты > 59) и переводит в UTC-мгновение.
 * API принимает ISO 8601, но отдаём всегда в UTC («Z»): у TZDate toISOString
 * сохраняет смещение таймзоны офиса, поэтому оборачиваем в обычный Date.
 */
export function buildInterval(
  date: string,
  time: string,
  durationMinutes: number,
  timezone: string,
): Interval {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);

  const from = new TZDate(year, month - 1, day, hours, minutes, 0, timezone);
  const to = new TZDate(year, month - 1, day, hours, minutes + durationMinutes, 0, timezone);

  return { from: toUtcIso(from), to: toUtcIso(to) };
}
