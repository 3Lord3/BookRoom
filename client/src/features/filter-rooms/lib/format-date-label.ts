import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// «2026-08-24» → «24 Августа, Пн»
export function formatDateLabel(date: string): string {
  return format(parseISO(date), 'd MMMM, EEEE', { locale: ru }).replace(
    /(^|,\s|\s)(\p{L})/gu,
    (_match, prefix: string, letter: string) => prefix + letter.toUpperCase(),
  );
}
