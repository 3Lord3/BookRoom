import { TZDate } from '@date-fns/tz';
import { describe, expect, it } from 'vitest';

import { defaultStartTimeInTimezone, todayInTimezone } from './schedule-defaults';

const msk = (hours: number, minutes: number) =>
  new TZDate(2026, 7, 26, hours, minutes, 0, 'Europe/Moscow');

describe('defaultStartTimeInTimezone', () => {
  it('округляет текущее время вверх к ближайшему слоту', () => {
    expect(defaultStartTimeInTimezone('Europe/Moscow', msk(15, 7))).toBe('15:15');
  });

  it('поднимает время до начала рабочих часов', () => {
    expect(defaultStartTimeInTimezone('Europe/Moscow', msk(8, 0))).toBe('09:00');
  });

  it('не заходит за конец рабочего дня', () => {
    expect(defaultStartTimeInTimezone('Europe/Moscow', msk(23, 50))).toBe('19:45');
  });
});

describe('todayInTimezone', () => {
  it('возвращает дату таймзоны офиса, а не UTC', () => {
    // 26 августа 2026, 01:00 по Москве — в UTC ещё 25-е
    const now = new TZDate(2026, 7, 26, 1, 0, 0, 'Europe/Moscow');
    expect(todayInTimezone('UTC', now)).toBe('2026-08-25');
    expect(todayInTimezone('Europe/Moscow', now)).toBe('2026-08-26');
  });
});
