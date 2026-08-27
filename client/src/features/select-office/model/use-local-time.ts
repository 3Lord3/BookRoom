import { useEffect, useState } from 'react';

function formatLabel(timezone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('timeZoneName')}`;
}

// «14:35 МСК» в таймзоне офиса
export function useLocalTime(timezone: string | null): string | null {
  // В стейте только тик раз в минуту, подпись выводится на каждом рендере
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!timezone) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [timezone]);

  if (!timezone) {
    return null;
  }
  return formatLabel(timezone, now ?? new Date());
}
