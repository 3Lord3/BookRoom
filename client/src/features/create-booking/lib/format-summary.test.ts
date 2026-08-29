import { describe, expect, it } from 'vitest';

import {
  formatOccurrenceCount,
  formatOccurrences,
  formatSeriesToastDescription,
  formatShortDate,
  formatSummary,
  formatToastDescription,
} from './format-summary';

const TZ = 'Europe/Moscow';
// Летом Москва = UTC+3, 07:00Z = 10:00 местных
const FROM = '2026-08-24T07:00:00.000Z';
const TO = '2026-08-24T08:00:00.000Z';

describe('formatSummary', () => {
  it('складывает сводку: день, время и длительность в таймзоне офиса', () => {
    expect(formatSummary({ from: FROM, to: TO }, TZ)).toBe(
      'Бронирование на Понедельник, 24 Августа, 10:00 - 11:00 (1 час)',
    );
  });

  it('форматирует короткую длительность как «15 мин»', () => {
    const to = '2026-08-24T07:15:00.000Z';
    expect(formatSummary({ from: FROM, to }, TZ)).toContain('(15 мин)');
  });
});

describe('formatShortDate', () => {
  it('даёт «24 августа» в таймзоне офиса (строчная дата — как в тосте)', () => {
    expect(formatShortDate(FROM, TZ)).toBe('24 августа');
  });
});

describe('formatToastDescription', () => {
  it('складывает описание тоста: комната, дата и время с поясом MSK', () => {
    expect(formatToastDescription('Эверест', { from: FROM, to: TO }, TZ)).toBe(
      'Комната Эверест, 24 августа, 10:00–11:00 MSK',
    );
  });
});

describe('форматтеры серии', () => {
  it('formatOccurrences склоняет «встреча/встречи/встреч»', () => {
    expect(formatOccurrences(2)).toBe('2 встречи');
    expect(formatOccurrences(5)).toBe('5 встреч');
  });

  it('formatOccurrenceCount даёт короткий счётчик «раз» для инфо-плашки', () => {
    expect(formatOccurrenceCount(1)).toBe('1 раз');
    expect(formatOccurrenceCount(4)).toBe('4 раза');
    expect(formatOccurrenceCount(5)).toBe('5 раз');
  });

  it('formatSeriesToastDescription ведёт описание от первого вхождения серии', () => {
    const series = [
      { from: FROM, to: TO },
      { from: '2026-08-31T07:00:00.000Z', to: '2026-08-31T08:00:00.000Z' },
    ];
    expect(formatSeriesToastDescription('Эверест', series, TZ, 'weekly')).toBe(
      '2 встречи еженедельно · Комната Эверест, 24 августа, 10:00–11:00 MSK',
    );
  });
});
