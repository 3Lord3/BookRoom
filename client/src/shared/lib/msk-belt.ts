import { TZDate } from '@date-fns/tz';

const MOSCOW_TIMEZONE = 'Europe/Moscow';

function formatHours(diff: number): string {
  return Number.isInteger(diff) ? String(diff) : String(Math.round(diff * 10) / 10);
}

// Пояс офиса относительно Москвы: Москва — «MSK», Екатеринбург — «MSK+2», Калининград — «MSK-1»
export function mskBelt(timezone: string): string {
  const now = Date.now();
  const moscowOffset = new TZDate(now, MOSCOW_TIMEZONE).getTimezoneOffset();
  const officeOffset = new TZDate(now, timezone).getTimezoneOffset();
  const diffHours = (moscowOffset - officeOffset) / 60;
  if (diffHours === 0) {
    return 'MSK';
  }
  const sign = diffHours > 0 ? '+' : '';
  return `MSK${sign}${formatHours(diffHours)}`;
}
