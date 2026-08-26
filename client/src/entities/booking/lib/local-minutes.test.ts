import { describe, expect, it } from 'vitest';

import { bookingLocalMinutes } from './local-minutes';

describe('bookingLocalMinutes', () => {
  it('переводит UTC-границы в минуты суток таймзоны офиса', () => {
    // Летом Москва = UTC+3: встреча в 09:00Z начинается в 12:00 по Москве
    expect(
      bookingLocalMinutes(
        { startsAt: '2026-08-24T09:00:00.000Z', endsAt: '2026-08-24T10:00:00.000Z' },
        'Europe/Moscow',
      ),
    ).toEqual({
      start: 12 * 60,
      end: 13 * 60,
    });
  });

  it('зажимает бронирование в рабочие часы офиса', () => {
    // 04:00–23:00 по Москве → 09:00–20:00
    expect(
      bookingLocalMinutes(
        { startsAt: '2026-08-24T01:00:00.000Z', endsAt: '2026-08-24T20:00:00.000Z' },
        'Europe/Moscow',
      ),
    ).toEqual({ start: 9 * 60, end: 20 * 60 });
  });

  it('возвращает null для бронирования вне рабочего дня', () => {
    expect(
      bookingLocalMinutes(
        { startsAt: '2026-08-24T21:00:00.000Z', endsAt: '2026-08-24T22:00:00.000Z' },
        'Europe/Moscow',
      ),
    ).toBeNull();
  });
});
