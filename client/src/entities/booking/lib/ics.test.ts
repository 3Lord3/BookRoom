import { describe, expect, it } from 'vitest';

import type { BookingView } from '@shared/api/dto';

import { buildBookingIcs, toUtcStamp } from './ics';
import { myBookings } from '../../../mocks/fixtures';

// 24 августа 2026, 11:00–12:00 UTC, не зависит от дня прогона
const booking: BookingView = {
  ...myBookings.all[0]!,
  title: 'Планирование, спринт; (важное) \\ тест',
  comment: 'Комментарий\nс переносом',
  startsAt: '2026-08-24T11:00:00.000Z',
  endsAt: '2026-08-24T12:00:00.000Z',
};

// Физические строки в логическую строку .ics (RFC 5545 §3.1)
function unfoldIcsLine(ics: string, name: string): string {
  const lines = ics.split('\r\n');
  const start = lines.findIndex((line) => line.startsWith(`${name}:`));
  const block = [lines[start]!];
  for (let i = start + 1; i < lines.length && lines[i]!.startsWith(' '); i++) {
    block.push(lines[i]!);
  }
  return block.map((line) => line.replace(/^ /, '')).join('');
}

describe('toUtcStamp', () => {
  it('преобразует ISO-строку в UTC-штамп с суффиксом Z', () => {
    expect(toUtcStamp('2026-08-24T11:00:00.000Z')).toBe('20260824T110000Z');
  });
});

describe('buildBookingIcs', () => {
  it('ставит DTSTART/DTEND в UTC независимо от таймзоны машины', () => {
    const ics = buildBookingIcs(booking);
    expect(ics).toContain('DTSTART:20260824T110000Z');
    expect(ics).toContain('DTEND:20260824T120000Z');
  });

  it('использует CRLF и включает обязательные заголовки и UID', () => {
    const ics = buildBookingIcs(booking);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('\r\nEND:VCALENDAR\r\n');
    expect(ics).toContain('UID:booking-future-current-user@bookroom');
  });

  it('экранирует спецсимволы текстовых значений', () => {
    const ics = buildBookingIcs(booking);
    expect(unfoldIcsLine(ics, 'SUMMARY')).toBe(
      'SUMMARY:Планирование\\, спринт\\; (важное) \\\\ тест',
    );
    expect(unfoldIcsLine(ics, 'DESCRIPTION')).toBe('DESCRIPTION:Комментарий\\nс переносом');
  });

  it('добавляет DESCRIPTION только при наличии комментария', () => {
    expect(buildBookingIcs({ ...booking, comment: null })).not.toContain('DESCRIPTION:');
  });

  it('заполняет LOCATION данными офиса и комнаты', () => {
    const ics = buildBookingIcs(booking);
    expect(unfoldIcsLine(ics, 'LOCATION')).toBe(
      "LOCATION:Офис Москва\\, Москва\\, ул. Лесная\\, 7 — Комната 'Эверест'\\, 4 этаж",
    );
  });

  it('фолдит строки длиннее 75 октетов, не разрывая UTF-8 символы', () => {
    const title = 'П'.repeat(200);
    const ics = buildBookingIcs({ ...booking, title, comment: null });

    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfoldIcsLine(ics, 'SUMMARY')).toBe(`SUMMARY:${title}`);
  });

  it('DTSTAMP — корректный UTC-штамп момента экспорта', () => {
    expect(buildBookingIcs(booking)).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
  });
});
