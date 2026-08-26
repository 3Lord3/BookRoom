import { describe, expect, it } from 'vitest';

import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('форматирует длительность меньше часа', () => {
    expect(formatDuration(15)).toBe('15 мин');
  });

  it('согласует слово «час» с числом', () => {
    expect(formatDuration(60)).toBe('1 час');
    expect(formatDuration(120)).toBe('2 часа');
    expect(formatDuration(300)).toBe('5 часов');
  });

  it('показывает часы и остаток минут', () => {
    expect(formatDuration(75)).toBe('1 ч 15 мин');
    expect(formatDuration(105)).toBe('1 ч 45 мин');
  });
});
