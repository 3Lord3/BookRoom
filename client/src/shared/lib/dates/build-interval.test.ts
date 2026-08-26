import { describe, expect, it } from 'vitest';

import { buildInterval } from './build-interval';

describe('buildInterval', () => {
  it('переводит дату и время таймзоны офиса в UTC-мгновения', () => {
    // Летом Москва = UTC+3
    expect(buildInterval('2026-08-26', '15:00', 60, 'Europe/Moscow')).toEqual({
      from: '2026-08-26T12:00:00.000Z',
      to: '2026-08-26T13:00:00.000Z',
    });
  });

  it('учитывает смещение таймзоны офиса', () => {
    expect(buildInterval('2026-01-14', '10:00', 30, 'Europe/Moscow')).toEqual({
      from: '2026-01-14T07:00:00.000Z',
      to: '2026-01-14T07:30:00.000Z',
    });
  });

  it('нормализует переполнение длительности через полночь', () => {
    expect(buildInterval('2026-08-26', '23:45', 30, 'UTC')).toEqual({
      from: '2026-08-26T23:45:00.000Z',
      to: '2026-08-27T00:15:00.000Z',
    });
  });
});
