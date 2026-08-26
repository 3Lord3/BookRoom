import type { BookingView } from '@shared/api/dto';

// ISO-строка → UTC-штамп `YYYYMMDDTHHMMSSZ`, который требует RFC 5545 для DTSTART/DTSTAMP
export function toUtcStamp(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Экранирование текстовых значений по RFC 5545: `\`, `;`, `,` и перевод строки
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Локация встречи: офис с адресом и комната. */
function icsLocation(booking: BookingView): string {
  const room = `Комната '${booking.room.name}', ${booking.room.floor} этаж`;
  return `${booking.office.name}, ${booking.office.address} — ${room}`;
}

// Фолдинг строк по RFC 5545 §3.1: физическая строка не длиннее 75 октетов, продолжение
// начинается с пробела; многобайтовый символ не должен разрываться между строками
const foldIcsLine = (line: string): string => {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  // строка продолжения теряет один октет на ведущий пробел
  let limit = 75;
  for (const char of [...line]) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > limit) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += charBytes;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
};

// DTSTAMP ставится на момент экспорта, поэтому файл каждый раз формируется заново
export function buildBookingIcs(booking: BookingView): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookRoom//Meetings//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@bookroom`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(booking.startsAt)}`,
    `DTEND:${toUtcStamp(booking.endsAt)}`,
    `SUMMARY:${escapeText(booking.title)}`,
    `LOCATION:${escapeText(icsLocation(booking))}`,
  ];
  if (booking.comment) {
    lines.push(`DESCRIPTION:${escapeText(booking.comment)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
