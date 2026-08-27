import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { Interval } from '@shared/lib/dates';

const pad = (value: number) => String(value).padStart(2, '0');

function zonedTime(iso: string, timezone: string): { hours: number; minutes: number } {
  const zoned = new TZDate(new Date(iso).getTime(), timezone);
  return { hours: zoned.getHours(), minutes: zoned.getMinutes() };
}

function minutesLabel(iso: string, timezone: string): string {
  const { hours, minutes } = zonedTime(iso, timezone);
  return `${pad(hours)}:${pad(minutes)}`;
}

function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

function durationLabel(from: string, to: string): string {
  const minutes = (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} мин`;
  }
  if (rest === 0) {
    return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`;
  }
  return `${hours} ч ${rest} мин`;
}

const capitalize = (value: string) => value.replace(/\p{L}/u, (letter) => letter.toUpperCase());

// «понедельник, 31 августа» → «Понедельник, 31 Августа»
function weekdayGenitive(iso: string, timezone: string): string {
  const zoned = new TZDate(new Date(iso).getTime(), timezone);
  const label = format(zoned, 'EEEE, d MMMM', { locale: ru });
  const [weekday = '', rest = ''] = label.split(', ');
  return `${capitalize(weekday)}, ${capitalize(rest)}`;
}

export function formatSummary(interval: Interval, timezone: string): string {
  const start = minutesLabel(interval.from, timezone);
  const end = minutesLabel(interval.to, timezone);
  const day = weekdayGenitive(interval.from, timezone);
  const duration = durationLabel(interval.from, interval.to);
  return `Бронирование на ${day}, ${start} - ${end} (${duration})`;
}

export function formatShortDate(iso: string, timezone: string): string {
  const zoned = new TZDate(new Date(iso).getTime(), timezone);
  return format(zoned, 'd MMMM', { locale: ru });
}

function timezoneAbbr(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}

export function formatToastDescription(
  roomName: string,
  interval: Interval,
  timezone: string,
): string {
  const start = minutesLabel(interval.from, timezone);
  const end = minutesLabel(interval.to, timezone);
  const day = formatShortDate(interval.from, timezone);
  return `Комната ${roomName}, ${day}, ${start}–${end} ${timezoneAbbr(interval.from, timezone)}`;
}

export function formatOccurrences(count: number): string {
  return `${count} ${pluralRu(count, 'встреча', 'встречи', 'встреч')}`;
}

export function formatRecurrence(count: number): string {
  return `${formatOccurrences(count)} еженедельно`;
}

export function formatSeriesToastDescription(
  roomName: string,
  series: Interval[],
  timezone: string,
): string {
  const first = series[0]!;
  return `${formatOccurrences(series.length)} · ${formatToastDescription(roomName, first, timezone)}`;
}
