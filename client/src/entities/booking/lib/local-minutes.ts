import { TZDate } from '@date-fns/tz';

import type { BookingView } from '@shared/api/dto';
import { WORK_DAY_END_MINUTES, WORK_DAY_START_MINUTES } from '@shared/config/schedule';

export interface LocalMinuteInterval {
  /** Минуты суток в таймзоне офиса */
  start: number;
  end: number;
}

/**
 * Границы бронирования в «минутах суток» таймзоны офиса, зажатые в рабочие часы.
 * null — пересечения с рабочим днём нет.
 */
export function bookingLocalMinutes(
  booking: Pick<BookingView, 'startsAt' | 'endsAt'>,
  timezone: string,
): LocalMinuteInterval | null {
  const start = zonedMinutes(booking.startsAt, timezone);
  const end = zonedMinutes(booking.endsAt, timezone);

  const clippedStart = Math.max(start, WORK_DAY_START_MINUTES);
  const clippedEnd = Math.min(end, WORK_DAY_END_MINUTES);

  return clippedEnd <= clippedStart ? null : { start: clippedStart, end: clippedEnd };
}

function zonedMinutes(isoTimestamp: string, timezone: string): number {
  const zoned = new TZDate(new Date(isoTimestamp).getTime(), timezone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}
