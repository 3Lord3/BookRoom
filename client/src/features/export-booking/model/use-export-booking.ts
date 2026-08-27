import { toast } from 'sonner';

import { buildBookingIcs, type BookingView } from '@entities/booking';

// Имя файла: запрещённые символы на дефис, хвостовые точки/пробелы отбрасываем
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const sanitizeFilename = (value: string) => {
  const cleaned = [...value]
    .filter((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  // Windows резервирует и базу до первой точки (NUL.notes), суффикс добавляем к ней
  const name = cleaned || 'встреча';
  const dot = name.indexOf('.');
  const head = dot === -1 ? name : name.slice(0, dot);
  const safeHead = RESERVED_WINDOWS_NAMES.test(head) ? `${head}_` : head;
  return dot === -1 ? safeHead : `${safeHead}${name.slice(dot)}`;
};

// URL освобождаем в следующем тике, иначе загрузка прервётся
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
