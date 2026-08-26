import { toast } from 'sonner';

import { buildBookingIcs, type BookingView } from '@entities/booking';

// Управляющие символы удаляем; недопустимые в именах файлов символы (Windows/macOS) — на дефис;
// хвостовые точки/пробелы отбрасываем, а Windows не создаёт файлы с зарезервированными именами
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const sanitizeFilename = (value: string) => {
  const cleaned = [...value]
    .filter((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return RESERVED_WINDOWS_NAMES.test(cleaned) ? `${cleaned}_` : cleaned;
};

// URL освобождается в следующем тике, чтобы не прервать начавшуюся загрузку
function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useExportBooking(): (booking: BookingView) => void {
  return (booking) => {
    downloadIcs(buildBookingIcs(booking), `${sanitizeFilename(booking.title)}.ics`);
    toast.success('Файл .ics сохранён');
  };
}
