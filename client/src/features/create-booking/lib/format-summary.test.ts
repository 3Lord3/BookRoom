import { describe, expect, it } from 'vitest';

import { formatShortDate, formatSummary, formatToastDescription } from './format-summary';

const TZ = 'Europe/Moscow';
// Летом Москва = UTC+3: 07:00Z — это 10:00 по Москве
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
  it('складывает описание тоста: комната, дата и время в таймзоне офиса', () => {
    // Аббревиатура таймзоны зависит от окружения (MSK / GMT+3) — проверяем детерминированную часть
    expect(formatToastDescription('Эверест', { from: FROM, to: TO }, TZ)).toMatch(
      /^Комната Эверест, 24 августа, 10:00–11:00 /,
    );
  });
});