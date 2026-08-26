import { describe, expect, it } from 'vitest';

import type { BookingView } from '@shared/api/dto';

import { splitBookings } from './split-bookings';

const NOW = new Date('2026-08-24T12:00:00.000Z').getTime();

function booking(id: string, startsAt: string): BookingView {
  return { id, startsAt, endsAt: startsAt } as BookingView;
}

describe('splitBookings', () => {
  it('делит бронирования на предстоящие и прошедшие по моменту старта', () => {
    const split = splitBookings(
      [
        booking('past', '2026-08-24T09:00:00.000Z'),
        booking('future', '2026-08-24T15:00:00.000Z'),
        booking('past-today', '2026-08-24T11:00:00.000Z'),
      ],
      NOW,
    );

    expect(split.upcoming.map((item) => item.id)).toEqual(['future']);
    expect(split.past.map((item) => item.id)).toEqual(['past-today', 'past']);
  });

  it('сортирует предстоящие по возрастанию, прошедшие по убыванию', () => {
    const split = splitBookings(
      [
        booking('future-late', '2026-08-26T09:00:00.000Z'),
        booking('future-early', '2026-08-24T15:00:00.000Z'),
        booking('past-early', '2026-08-20T09:00:00.000Z'),
        booking('past-late', '2026-08-24T09:00:00.000Z'),
      ],
      NOW,
    );

    expect(split.upcoming.map((item) => item.id)).toEqual(['future-early', 'future-late']);
    expect(split.past.map((item) => item.id)).toEqual(['past-late', 'past-early']);
  });
});
