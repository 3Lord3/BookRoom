import {
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';

import { buildInterval, type Interval } from './dates';

export interface DaySlot {
  /** Границы слота в «минутах суток» таймзоны офиса */
  start: number;
  end: number;
  busy: boolean;
}

export interface SlotRange {
  startIndex: number;
  endIndex: number;
}

export interface MinuteInterval {
  start: number;
  end: number;
}

const DAY_SLOT_COUNT = (WORK_DAY_END_MINUTES - WORK_DAY_START_MINUTES) / TIME_STEP_MINUTES;

/** Сетка рабочего дня 09:00–20:00 шагом 15 минут, изначально вся свободная */
export function buildDaySlots(): DaySlot[] {
  return Array.from({ length: DAY_SLOT_COUNT }, (_, index) => ({
    start: WORK_DAY_START_MINUTES + index * TIME_STEP_MINUTES,
    end: WORK_DAY_START_MINUTES + (index + 1) * TIME_STEP_MINUTES,
    busy: false,
  }));
}

const overlaps = (left: MinuteInterval, right: MinuteInterval): boolean =>
  left.start < right.end && right.start < left.end;

/** Помечает занятыми слоты, пересекающиеся хотя бы с одним интервалом бронирований */
export function markBusySlots(slots: DaySlot[], intervals: MinuteInterval[]): DaySlot[] {
  return slots.map((slot) => ({
    ...slot,
    busy: intervals.some((interval) => overlaps(slot, interval)),
  }));
}

export function isRangeFree(slots: DaySlot[], range: SlotRange): boolean {
  return slots.slice(range.startIndex, range.endIndex + 1).every((slot) => !slot.busy);
}

/**
 * Максимальный непрерывный свободный диапазон от anchor к target включительно:
 * рост останавливается на первом занятом слоте. null — сам anchor занят.
 */
export function clampFreeRange(slots: DaySlot[], anchor: number, target: number): SlotRange | null {
  const anchorSlot = slots[anchor];
  if (!anchorSlot || anchorSlot.busy) {
    return null;
  }

  const step = target >= anchor ? 1 : -1;
  let cursor = anchor;
  while (cursor !== target) {
    const next = slots[cursor + step];
    if (!next || next.busy) {
      break;
    }
    cursor += step;
  }

  return { startIndex: Math.min(anchor, cursor), endIndex: Math.max(anchor, cursor) };
}

/** Выбранный диапазон слотов → UTC-интервал для запросов к API */
export function slotRangeToInterval(date: string, range: SlotRange, timezone: string): Interval {
  const startMinutes = WORK_DAY_START_MINUTES + range.startIndex * TIME_STEP_MINUTES;
  const durationMinutes = (range.endIndex - range.startIndex + 1) * TIME_STEP_MINUTES;
  return buildInterval(date, minutesToTime(startMinutes), durationMinutes, timezone);
}

function minutesToTime(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
