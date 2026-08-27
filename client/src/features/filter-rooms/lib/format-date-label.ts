import { parseISO } from 'date-fns';

import { formatDateWithShortWeekday } from '@shared/lib/dates';

// «2026-08-24» → «24 Августа, Пн»
export function formatDateLabel(date: string): string {
  return formatDateWithShortWeekday(parseISO(date));
}