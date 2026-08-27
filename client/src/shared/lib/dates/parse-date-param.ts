import { format, isValid, parseISO } from 'date-fns';

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Невалидная дата из searchParams заменяется на fallback
export function parseDateParam<T extends string | null>(
  value: string | null,
  fallback: T,
): string | T {
  if (value === null || !DATE_PARAM_PATTERN.test(value)) {
    return fallback;
  }
  // round-trip отсекает несуществующие дни, которые parseISO нормализует
  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === value ? value : fallback;
}
