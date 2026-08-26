import { TZDate } from '@date-fns/tz';

import {
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';

/** Сегодняшняя дата в таймзоне офиса, «YYYY-MM-DD» */
export function todayInTimezone(timezone: string, now = new Date()): string {
  const localNow = new TZDate(now.getTime(), timezone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${localNow.getFullYear()}-${pad(localNow.getMonth() + 1)}-${pad(localNow.getDate())}`;
}

/**
 * Время начала по умолчанию: ближайший будущий слот шагом 15 минут,
 * зажатый в рабочие часы офиса (09:00–19:45).
 */
export function defaultStartTimeInTimezone(timezone: string, now = new Date()): string {
  const localNow = new TZDate(now.getTime(), timezone);
  const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();

  const nextSlot = Math.ceil(nowMinutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  const clamped = Math.min(
    Math.max(nextSlot, WORK_DAY_START_MINUTES),
    WORK_DAY_END_MINUTES - TIME_STEP_MINUTES,
  );

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}
