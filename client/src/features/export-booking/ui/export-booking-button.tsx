import { CalendarPlus } from 'lucide-react';

import type { BookingView } from '@entities/booking';
import { Button } from '@shared/ui/button';

import { useExportBooking } from '../model/use-export-booking';

interface ExportBookingButtonProps {
  booking: BookingView;
}

export function ExportBookingButton({ booking }: ExportBookingButtonProps) {
  const exportBooking = useExportBooking();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => exportBooking(booking)}
      className="h-auto shrink-0 rounded-8 bg-transparent px-16 py-10 text-xl font-semibold text-blue-700 shadow-none hover:bg-blue-50 hover:text-blue-900"
    >
      <CalendarPlus className="size-16" strokeWidth={2.5} />
      Скачать .ics
    </Button>
  );
}
