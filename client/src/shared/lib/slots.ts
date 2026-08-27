import {
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';

import { buildInterval, type Interval } from './dates';

export interface DaySlot {
  // Границы слота в минутах суток офиса
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

// Сетка рабочего дня шагом 15 минут, изначально свободная
export function buildDaySlots(): DaySlot[] {
  return Array.from({ length: DAY_SLOT_COUNT }, (_, index) => ({
    start: WORK_DAY_START_MINUTES + index * TIME_STEP_MINUTES,
    end: WORK_DAY_START_MINUTES + (index + 1) * TIME_STEP_MINUTES,
    busy: false,
  }));
}

const overlaps = (left: MinuteInterval, right: MinuteInterval): boolean =>
  left.start < right.end && right.start < left.end;

// Занятые слоты по пересечению с интервалами бронирований
export function markBusySlots(slots: DaySlot[], intervals: MinuteInterval[]): DaySlot[] {
  return slots.map((slot) => ({
    ...slot,
    busy: intervals.some((interval) => overlaps(slot, interval)),
  }));
}

export function isRangeFree(slots: DaySlot[], range: SlotRange): boolean {
  return slots.slice(range.startIndex, range.endIndex + 1).every((slot) => !slot.busy);
}

// Свободный диапазон от anchor к target; рост останавливает занятый слот.
// null, если занят сам anchor
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

// Диапазон слотов в UTC-интервал для запросов
export function slotRangeToInterval(date: string, range: SlotRange, timezone: string): Interval {
  const startMinutes = WORK_DAY_START_MINUTES + range.startIndex * TIME_STEP_MINUTES;
  const durationMinutes = (range.endIndex - range.startIndex + 1) * TIME_STEP_MINUTES;
  return buildInterval(date, minutesToTime(startMinutes), durationMinutes, timezone);
}

function minutesToTime(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
