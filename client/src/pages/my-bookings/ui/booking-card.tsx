import { DoorOpen } from 'lucide-react';

import {
  bookingDay,
  bookingMonth,
  formatBookingTimeRange,
  type BookingView,
} from '@entities/booking';
import { ExportBookingButton } from '@features/export-booking';
import { Button } from '@shared/ui/button';

interface BookingCardProps {
  booking: BookingView;
  // null, когда отмена недоступна (прошедшее бронирование)
  onCancel?: (booking: BookingView) => void;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const timezone = booking.office.timezone;

  return (
    <article className="flex items-center justify-between gap-24 rounded-16 border border-border bg-card p-24">
      <div className="flex min-w-0 items-center gap-24">
        <div className="flex h-80 w-80 shrink-0 flex-col items-center justify-center gap-4 rounded-12 bg-blue-50">
          <span className="text-base font-bold uppercase text-blue-400">
            {bookingMonth(booking.startsAt, timezone)}
          </span>
          <span className="text-7xl font-extrabold leading-none text-blue-900">
            {bookingDay(booking.startsAt, timezone)}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <h3 className="truncate text-4xl font-bold">{booking.title}</h3>
          <div className="flex items-center gap-8">
            <DoorOpen className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
            <span className="text-xl font-semibold text-teal-700">{booking.room.name}</span>
            <span aria-hidden className="size-4 rounded-full bg-blue-400" />
            <span className="text-xl text-blue-700">{booking.room.floor} этаж</span>
            <span aria-hidden className="size-4 rounded-full bg-blue-400" />
            <span className="text-xl text-blue-700">
              {formatBookingTimeRange(booking, timezone)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-8">
        <ExportBookingButton booking={booking} />
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel(booking)}
            className="h-auto shrink-0 rounded-8 border-red-400 px-16 py-10 text-xl font-semibold text-red-400 hover:bg-red-100/50 hover:text-red-600"
          >
            Отменить
          </Button>
        )}
      </div>
    </article>
  );
}
