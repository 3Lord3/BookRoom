import { TZDate } from '@date-fns/tz';

/** Сегодняшняя дата в таймзоне офиса, «YYYY-MM-DD» */
export function todayInTimezone(timezone: string, now = new Date()): string {
  const localNow = new TZDate(now.getTime(), timezone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${localNow.getFullYear()}-${pad(localNow.getMonth() + 1)}-${pad(localNow.getDate())}`;
}
