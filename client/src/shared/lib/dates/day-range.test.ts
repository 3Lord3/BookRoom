import { describe, expect, it } from 'vitest';

import { dayRange } from './day-range';

describe('dayRange', () => {
  it('покрывает календарный день таймзоны офиса UTC-границами', () => {
    // Сутки 26 августа по Москве: 25T21:00Z … 26T21:00Z
    expect(dayRange('2026-08-26', 'Europe/Moscow')).toEqual({
      from: '2026-08-25T21:00:00.000Z',
      to: '2026-08-26T21:00:00.000Z',
    });
  });

  it('учитывает смещение другой таймзоны', () => {
    // Летом Берлин = UTC+2
    expect(dayRange('2026-08-26', 'Europe/Berlin').from).toBe('2026-08-25T22:00:00.000Z');
  });
});
