import { describe, expect, it } from 'vitest';

import { formatDayTitle } from './format-day-title';

describe('formatDayTitle', () => {
  it('форматирует дату как в макете расписания', () => {
    // 24 октября 2026 — суббота
    expect(formatDayTitle('2026-10-24')).toBe('Суббота, 24 октября');
  });
});
