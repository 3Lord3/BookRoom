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

/** Блок события сетки: границы в минутах суток офиса для позиционирования */
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
      /** Начало выбора: клик или зажатие мыши на слоте */
      onPress: (slotIndex: number) => void;
      /** Расширение диапазона при перетаскивании указателя по слотам */
      onDragOver: (slotIndex: number) => void;
      /** Выбранный интервал как UTC-границы; null — выбор ещё не сделан */
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

/**
 * Расписание комнаты на день. Дата живёт в searchParams (?date=), выбранный
 * интервал — в локальном стейте; подтверждённый интервал уходит обратно в URL
 * (?from=&to=) — так форма бронирования (фаза 3) получит его без нового стейта.
 */
export function useDaySchedule(roomId: string, timezone: string): DayScheduleModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const date = parseDateParam(searchParams.get('date'), todayInTimezone(timezone));

  // Выбор привязан к своему дню: на другом дне он скрыт, но при возврате
  // восстанавливается; валидность по свежим слотам пересчитывается на каждом рендере.
  // origin различает выбор кликом и перетаскиванием — после drag следующее нажатие
  // обязано начинать новый диапазон, а не расширять прежний
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
  // Свои брони различимы только по ответу /me: до него события скрыты целиком,
  // иначе своя бронь мелькает обезличенным «Занято»; при ошибке /me все — как «Занято»
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

  // После refetch выбор мог «попасть» на чужое бронирование — такой выбор
  // игнорируется: валидность проверяется на каждом рендере, без эффекта
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
      // После drag следующее нажатие начинает новый диапазон; origin возвращаем
      // в click, чтобы последующие нажатия снова расширяли выбор
      if (previousOrigin === 'drag') {
        return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'click' };
      }
      if (!previous) {
        return { date, range: { startIndex: slotIndex, endIndex: slotIndex }, origin: 'click' };
      }
      // Расширяем от ближней границы выбора к нажатой ячейке: рост
      // останавливается на первом занятом слоте (clampFreeRange)
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

  // Расширение диапазона при перетаскивании: от якоря (начального слота) к курсору
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

  const book = () => {
    if (!bookedInterval) {
      return;
    }
    updateParams((next) => {
      next.set('from', bookedInterval.from);
      next.set('to', bookedInterval.to);
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
