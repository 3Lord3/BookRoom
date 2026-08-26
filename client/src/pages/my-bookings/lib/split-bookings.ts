import type { BookingView } from '@shared/api/dto';

export interface SplitBookings {
  upcoming: BookingView[];
  past: BookingView[];
}

/** Разбиение на предстоящие/прошедшие, как на бэкенде (scope=upcoming/past по startsAt). */
export function splitBookings(bookings: BookingView[], now = Date.now()): SplitBookings {
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  for (const booking of bookings) {
    if (new Date(booking.startsAt).getTime() > now) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  }
  upcoming.sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
  past.sort(
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
  );
  return { upcoming, past };
}
