import { TZDate } from '@date-fns/tz';

import type { Interval } from './build-interval';

// Границы календарного дня [00:00, 24:00) в таймзоне офиса как UTC-интервал
export function dayRange(date: string, timezone: string): Interval {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);

  const from = new TZDate(year, month - 1, day, 0, 0, 0, timezone);
  const to = new TZDate(year, month - 1, day, 24, 0, 0, timezone);

  return {
    from: new Date(from.getTime()).toISOString(),
    to: new Date(to.getTime()).toISOString(),
  };
}
