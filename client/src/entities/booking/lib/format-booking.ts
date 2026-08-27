import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { BookingView } from '@shared/api/dto';

const pad = (value: number) => String(value).padStart(2, '0');

const capitalize = (value: string) => value.replace(/\p{L}/u, (letter) => letter.toUpperCase());

function zonedTime(iso: string, timezone: string): { hours: number; minutes: number } {
  const zoned = new TZDate(new Date(iso).getTime(), timezone);
  return { hours: zoned.getHours(), minutes: zoned.getMinutes() };
}

function minutesLabel(iso: string, timezone: string): string {
  const { hours, minutes } = zonedTime(iso, timezone);
  return `${pad(hours)}:${pad(minutes)}`;
}

function timezoneAbbr(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}

// Месяц в именительном падеже: «Октябрь»
export function bookingMonth(iso: string, timezone: string): string {
  const zoned = new TZDate(new Date(iso).getTime(), timezone);
  return capitalize(format(zoned, 'LLLL', { locale: ru }));
}

// День месяца в таймзоне офиса
export function bookingDay(iso: string, timezone: string): number {
  return new TZDate(new Date(iso).getTime(), timezone).getDate();
}

export function formatBookingTimeRange(
  booking: Pick<BookingView, 'startsAt' | 'endsAt'>,
  timezone: string,
): string {
  return `${minutesLabel(booking.startsAt, timezone)} - ${minutesLabel(
    booking.endsAt,
    timezone,
  )} ${timezoneAbbr(booking.startsAt, timezone)}`;
}

export function formatBookingFull(
  booking: Pick<BookingView, 'startsAt' | 'endsAt'>,
  timezone: string,
): string {
  const zoned = new TZDate(new Date(booking.startsAt).getTime(), timezone);
  const day = capitalize(format(zoned, 'EEEE, d MMMM', { locale: ru }));
  return `${day}, ${minutesLabel(booking.startsAt, timezone)} - ${minutesLabel(
    booking.endsAt,
    timezone,
  )}`;
}

export function formatBookingRoom(room: Pick<BookingView['room'], 'name' | 'floor'>): string {
  return `Комната '${room.name}', ${room.floor} этаж`;
}
