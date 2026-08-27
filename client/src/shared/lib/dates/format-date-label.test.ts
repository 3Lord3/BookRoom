import { describe, expect, it } from 'vitest';

import { formatDateWithShortWeekday } from './format-date-label';

describe('formatDateWithShortWeekday', () => {
  it('выводит день, месяц и короткий день недели с заглавной', () => {
    expect(formatDateWithShortWeekday(new Date(2026, 7, 24))).toBe('24 Августа, Пн');
  });

  it('сокращает день недели до двух букв', () => {
    expect(formatDateWithShortWeekday(new Date(2026, 9, 24))).toBe('24 Октября, Сб');
  });
});