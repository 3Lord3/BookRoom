import { TZDate } from '@date-fns/tz';
import { describe, expect, it } from 'vitest';

import { todayInTimezone } from './today-in-timezone';

describe('todayInTimezone', () => {
  it('возвращает дату таймзоны офиса, а не UTC', () => {
    // 01:00 по Москве, в UTC ещё 25-е
    const now = new TZDate(2026, 7, 26, 1, 0, 0, 'Europe/Moscow');
    expect(todayInTimezone('UTC', now)).toBe('2026-08-25');
    expect(todayInTimezone('Europe/Moscow', now)).toBe('2026-08-26');
  });
});
