import { useSearchParams } from 'react-router-dom';

import { buildInterval, todayInTimezone } from '@shared/lib/dates';

import { defaultStartTimeInTimezone } from '../lib/schedule-defaults';

const DATE_KEY = 'date';
const TIME_KEY = 'time';
const DURATION_KEY = 'duration';
const CAPACITY_KEY = 'capacity';

/** Длительность по умолчанию — «1 час» из макета */
const DEFAULT_DURATION_MINUTES = 60;

export interface RoomFiltersRequest {
  minCapacity?: number;
  from?: string;
  to?: string;
}

export interface RoomFiltersModel {
  date: string | null;
  time: string | null;
  duration: number;
  capacity: number | null;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setDuration: (minutes: number) => void;
  setCapacity: (capacity: number | null) => void;
  reset: () => void;
  /** Параметры GET /rooms, выведенные из фильтров */
  request: RoomFiltersRequest;
}

/**
 * Фильтры списка комнат живут в searchParams (синхронизация с URL).
 * Пока офис не выбран — интервал не строится и список не запрашивается.
 */
export function useRoomFilters(timezone: string | null): RoomFiltersModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const durationParam = searchParams.get(DURATION_KEY);
  const capacityParam = searchParams.get(CAPACITY_KEY);

  const date = searchParams.get(DATE_KEY) ?? (timezone ? todayInTimezone(timezone) : null);
  const time =
    searchParams.get(TIME_KEY) ?? (timezone ? defaultStartTimeInTimezone(timezone) : null);
  const duration = durationParam ? Number(durationParam) : DEFAULT_DURATION_MINUTES;
  const capacity = capacityParam ? Number(capacityParam) : null;

  const interval = timezone && date && time ? buildInterval(date, time, duration, timezone) : null;

  return {
    date,
    time,
    duration,
    capacity,
    setDate: (value) => updateParam(DATE_KEY, value),
    setTime: (value) => updateParam(TIME_KEY, value),
    setDuration: (value) => updateParam(DURATION_KEY, String(value)),
    setCapacity: (value) => updateParam(CAPACITY_KEY, value === null ? null : String(value)),
    reset: () =>
      setSearchParams(
        (() => {
          const next = new URLSearchParams(searchParams);
          for (const key of [DATE_KEY, TIME_KEY, DURATION_KEY, CAPACITY_KEY]) {
            next.delete(key);
          }
          return next;
        })(),
      ),
    request: {
      ...(capacity !== null ? { minCapacity: capacity } : {}),
      ...(interval ?? {}),
    },
  };
}
