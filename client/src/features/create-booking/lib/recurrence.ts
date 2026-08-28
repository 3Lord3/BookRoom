import { TZDate } from '@date-fns/tz';

import type { Interval } from '@shared/lib/dates';

// Варианты повтора серии; у weekdays вхождения только в будни
export type Recurrence = 'daily' | 'weekdays' | 'weekly';

const WEEKEND_DAYS = new Set([0, 6]);

// Сдвиг в календарных днях таймзоны офиса, а не +24 UTC-часа: при переходе на
// летнее время фиксированный сдвиг в мгновениях сместил бы встречу на час
function stepInTimezone(from: number, timezone: string, stepDays: number): number {
  const zoned = new TZDate(from, timezone);
  zoned.setDate(zoned.getDate() + stepDays);
  return zoned.getTime();
}

export function buildOccurrenceSeries(
  base: Interval,
  count: number,
  recurrence: Recurrence,
  timezone: string,
): Interval[] {
  if (count < 1) {
    return [];
  }
  const fromMs = new Date(base.from).getTime();
  const durationMs = new Date(base.to).getTime() - fromMs;
  const result: Interval[] = [base];
  let cursor = fromMs;
  while (result.length < count) {
    cursor = stepInTimezone(cursor, timezone, recurrence === 'weekly' ? 7 : 1);
    if (recurrence === 'weekdays' && WEEKEND_DAYS.has(new TZDate(cursor, timezone).getDay())) {
      continue;
    }
    result.push({
      from: new Date(cursor).toISOString(),
      to: new Date(cursor + durationMs).toISOString(),
    });
  }
  return result;
}
