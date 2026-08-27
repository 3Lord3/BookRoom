import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// «2026-10-24» → «Суббота, 24 октября»
export function formatDayTitle(date: string): string {
  const label = format(parseISO(date), 'EEEE, d MMMM', { locale: ru });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
