import { toast } from 'sonner';

import { buildBookingIcs, type BookingView } from '@entities/booking';

// Недопустимые в именах файлов символы (Windows/macOS) — заменяем на дефис
const sanitizeFilename = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-').trim();

/** Скачивает .ics через Blob; объектный URL освобождается сразу после клика. */
function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Экспорт встречи в календарь: сборка .ics и скачивание файла с уведомлением. */
export function useExportBooking(): (booking: BookingView) => void {
  return (booking) => {
    downloadIcs(buildBookingIcs(booking), `${sanitizeFilename(booking.title)}.ics`);
    toast.success('Файл .ics сохранён');
  };
}
