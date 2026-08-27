import { describe, expect, it } from 'vitest';

import {
  bookingDay,
  bookingMonth,
  formatBookingFull,
  formatBookingRoom,
  formatBookingTimeRange,
} from './format-booking';

describe('format-booking', () => {
  // 2026-08-24 понедельник, летом Москва = UTC+3
  const booking = {
    startsAt: '2026-08-24T11:00:00.000Z',
    endsAt: '2026-08-24T12:00:00.000Z',
  };

  it('bookingMonth возвращает месяц в именительном падеже с заглавной буквы', () => {
    expect(bookingMonth('2026-10-24T12:00:00.000Z', 'Europe/Moscow')).toBe('Октябрь');
    expect(bookingMonth('2026-08-24T12:00:00.000Z', 'Europe/Moscow')).toBe('Август');
  });

  it('bookingDay возвращает день месяца в таймзоне офиса', () => {
    // 22:00Z 24 августа это уже 25-е по Москве
    expect(bookingDay('2026-08-24T22:00:00.000Z', 'Europe/Moscow')).toBe(25);
  });

  it('formatBookingTimeRange выводит время в таймзоне офиса с аббревиатурой', () => {
    // Аббревиатура зависит от окружения (MSK / GMT+3), проверяем детерминированную часть
    expect(formatBookingTimeRange(booking, 'Europe/Moscow')).toMatch(/^14:00 - 15:00 /);
  });

  it('formatBookingFull выводит день недели, дату и время в таймзоне офиса', () => {
    expect(formatBookingFull(booking, 'Europe/Moscow')).toBe(
      'Понедельник, 24 августа, 14:00 - 15:00',
    );
  });

  it('formatBookingRoom собирает место из названия комнаты и этажа', () => {
    expect(formatBookingRoom({ name: 'Эверест', floor: 4 })).toBe("Комната 'Эверест', 4 этаж");
  });
});
