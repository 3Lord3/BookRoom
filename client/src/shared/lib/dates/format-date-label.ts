import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// «24.10.2026» → «24 Октября, Сб»: месяц и короткий день недели с заглавной
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

const capitalize = (value: string) => value.replace(/\p{L}/u, (letter) => letter.toUpperCase());

export function formatDateWithShortWeekday(date: Date): string {
  const datePart = capitalize(format(date, 'd MMMM', { locale: ru }));
  return `${datePart}, ${capitalize(weekdayFormatter.format(date))}`;
}