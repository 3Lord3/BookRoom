import { addDays, format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  bookingLocalMinutes,
  useGetRoomBookingsQuery,
  type LocalMinuteInterval,
} from '@entities/booking';
import { useGetViewerQuery } from '@entities/viewer';
import { toQueryState } from '@shared/api/query-state';
import { MAX_AHEAD_DAYS } from '@shared/config/schedule';
import type { Interval } from '@shared/lib/dates';
import { dayRange, parseDateParam, todayInTimezone } from '@shared/lib/dates';
import {
  buildDaySlots,
  clampFreeRange,
  isRangeFree,
  markBusySlots,
  slotRangeToInterval,
  type DaySlot,
  type SlotRange,
} from '@shared/lib/slots';

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
      slots: DaySlot[];
      events: ScheduleEventModel[];
      selection: SlotRange | null;
      // Клик или зажатие мыши на слоте
      onPress: (slotIndex: number) => void;
      // Расширение диапазона при перетаскивании
      onDragOver: (slotIndex: number) => void;
      // UTC-границы выбранного интервала; null, пока выбор не сделан
      bookedInterval: Interval | null;
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

// Дата живёт в searchParams (?date=), интервал в локальном стейте; подтверждённый
// уходит обратно в URL (?from=&to=), откуда его забирает форма бронирования
export function useDaySchedule(roomId: string, timezone: string): DayScheduleModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const date = parseDateParam(searchParams.get('date'), todayInTimezone(timezone));

  // Выбор привязан к своему дню; origin различает клик и drag, после drag
  // следующее нажатие начинает новый диапазон
  const [stored, setStored] = useState<{
    date: string;
    range: SlotRange;
    origin: 'click' | 'drag';
  } | null>(null);
  const selection = stored?.date === date ? stored.range : null;

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
  };

  const selectDate = (value: string) =>
    updateParams((next) => {
      next.set('date', value);
      // Выбранный интервал относится к прежнему дню
      next.delete('from');
      next.delete('to');
    });

  const range = dayRange(date, timezone);
  const scheduleResult = useGetRoomBookingsQuery({ roomId, from: range.from, to: range.to });
  const viewerResult = useGetViewerQuery();
  const viewerId = viewerResult.data?.id ?? null;
  // До ответа /me события скрыты: своя бронь иначе мелькает чужим «Занято»
  const viewerKnown = !viewerResult.isLoading;

  const slots = useMemo(() => {
    if (!scheduleResult.data) {
      return buildDaySlots();
    }
    const busy = scheduleResult.data
      .map((booking) => bookingLocalMinutes(booking, timezone))
      .filter((interval): interval is LocalMinuteInterval => interval !== null);
    return markBusySlots(buildDaySlots(), busy);
  }, [scheduleResult.data, timezone]);

  // После refetch выбор мог попасть на чужую бронь, валидность считаем на каждом рендере
  const validSelection = selection !== null && isRangeFree(slots, selection) ? selection : null;

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

  const onPress = (slotIndex: number) => {
    if (slots[slotIndex]?.busy) {
      setStored(null);
      return;
    }
    setStored((current) => {
      const previous = current?.date === date ? current.range : null;
      const previousOrigin = current?.date === date ? current.origin : null;
      // origin возвращаем в click, чтобы следующие нажатия снова расширяли выбор
      if (previousOrigin === 'drag') {
        return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'click' };
      }
      if (!previous) {
        return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'click' };
      }
      // Расширяем к нажатой ячейке, рост останавливает занятый слот (clampFreeRange)
      if (slotIndex > previous.endIndex) {
        return {
          date,
          range: clampFreeRange(slots, previous.startIndex, slotIndex) ?? {
            startIndex: slotIndex,
            endIndex: slotIndex,
          },
          origin: 'click',
        };
      }
      if (slotIndex < previous.startIndex) {
        return {
          date,
          range: clampFreeRange(slots, previous.endIndex, slotIndex) ?? {
            startIndex: slotIndex,
            endIndex: slotIndex,
          },
          origin: 'click',
        };
      }
      // Нажатие внутри выбора начинает новый интервал с этой ячейки
      return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'click' };
    });
  };

  // Расширение от якоря к курсору при перетаскивании
  const onDragOver = (slotIndex: number) => {
    if (slots[slotIndex]?.busy) {
      return;
    }
    setStored((current) => {
      const previous = current?.date === date ? current.range : null;
      if (!previous) {
        return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'drag' };
      }
      if (slotIndex > previous.endIndex) {
        return {
          date,
          range: clampFreeRange(slots, previous.startIndex, slotIndex) ?? {
            startIndex: slotIndex,
            endIndex: slotIndex,
          },
          origin: 'drag',
        };
      }
      if (slotIndex < previous.startIndex) {
        return {
          date,
          range: clampFreeRange(slots, previous.endIndex, slotIndex) ?? {
            startIndex: slotIndex,
            endIndex: slotIndex,
          },
          origin: 'drag',
        };
      }
      // Возврат внутрь выбора не схлопывает его при перетаскивании
      return { date, range: previous, origin: 'drag' };
    });
  };

  const bookedInterval = useMemo(
    () => (validSelection ? slotRangeToInterval(date, validSelection, timezone) : null),
    [validSelection, date, timezone],
  );

  // Модалка открывается и без интервала пустой формой; create оставляет её открытой
  const book = () => {
    updateParams((next) => {
      if (bookedInterval) {
        next.set('from', bookedInterval.from);
        next.set('to', bookedInterval.to);
      } else {
        next.delete('from');
        next.delete('to');
      }
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
      slots,
      events,
      selection: validSelection,
      onPress,
      onDragOver,
      bookedInterval,
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
