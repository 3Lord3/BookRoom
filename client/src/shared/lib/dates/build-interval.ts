import { TZDate } from '@date-fns/tz';

export interface Interval {
  // ISO 8601 UTC для бэкенда
  from: string;
  to: string;
}

const toUtcIso = (date: TZDate): string => new Date(date.getTime()).toISOString();

// Интервал [начало, +длительность) в таймзоне офиса. TZDate сам нормализует переполнение
// минут, а UTC берём через Date, потому что toISOString у TZDate сохраняет смещение офиса
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
