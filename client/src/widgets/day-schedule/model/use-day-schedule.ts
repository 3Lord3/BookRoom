import { addDays, format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { bookingLocalMinutes, useGetRoomBookingsQuery } from '@entities/booking';
import { useGetViewerQuery } from '@entities/viewer';
import { toQueryState } from '@shared/api/query-state';
import { MAX_AHEAD_DAYS } from '@shared/config/schedule';
import { dayRange, parseDateParam, todayInTimezone } from '@shared/lib/dates';

import { formatDayTitle } from '../lib/format-day-title';

// Блок события: границы в минутах суток офиса
export interface ScheduleEventModel {
  key: string;
  start: number;
  end: number;
  kind: 'own' | 'other';
  label: string;
}

export type DayScheduleContent =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'success';
      events: ScheduleEventModel[];
      book: () => void;
    };

export interface DayScheduleModel {
  date: string;
  dateLabel: string;
  minDate: string;
  maxDate: string;
  selectDate: (date: string) => void;
  content: DayScheduleContent;
}

// Дата живёт в searchParams (?date=); кнопка бронирования открывает пустую форму
export function useDaySchedule(roomId: string, timezone: string): DayScheduleModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const date = parseDateParam(searchParams.get('date'), todayInTimezone(timezone));

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
  };

  const selectDate = (value: string) =>
    updateParams((next) => {
      next.set('date', value);
      next.delete('from');
      next.delete('to');
    });

  const range = dayRange(date, timezone);
  const scheduleResult = useGetRoomBookingsQuery({ roomId, from: range.from, to: range.to });
  const viewerResult = useGetViewerQuery();
  const viewerId = viewerResult.data?.id ?? null;
  // До ответа /me события скрыты: своя бронь иначе мелькает чужим «Занято»
  const viewerKnown = !viewerResult.isLoading;

  const events = useMemo<ScheduleEventModel[]>(() => {
    if (!viewerKnown) {
      return [];
    }
    return (scheduleResult.data ?? []).flatMap((booking) => {
      const bounds = bookingLocalMinutes(booking, timezone);
      if (!bounds) {
        return [];
      }
      const own = booking.userId === viewerId;
      return [
        {
          key: booking.id,
          start: bounds.start,
          end: bounds.end,
          kind: own ? ('own' as const) : ('other' as const),
          label: own ? booking.title : 'Занято',
        },
      ];
    });
  }, [scheduleResult.data, timezone, viewerId, viewerKnown]);

  // Модалка открывается пустой формой; create оставляет её открытой
  const book = () => {
    updateParams((next) => {
      next.delete('from');
      next.delete('to');
      next.set('create', '1');
    });
  };

  const queryState = toQueryState(scheduleResult);

  let content: DayScheduleContent;
  if (queryState.status === 'loading') {
    content = { status: 'loading' };
  } else if (queryState.status === 'error') {
    content = {
      status: 'error',
      message: queryState.message,
      retry: () => void scheduleResult.refetch(),
    };
  } else {
    content = {
      status: 'success',
      events,
      book,
    };
  }

  const today = todayInTimezone(timezone);

  return {
    date,
    dateLabel: formatDayTitle(date),
    minDate: today,
    maxDate: format(addDays(parseISO(today), MAX_AHEAD_DAYS), 'yyyy-MM-dd'),
    selectDate,
    content,
  };
}
