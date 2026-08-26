import { describe, expect, it } from 'vitest';

import {
  buildDaySlots,
  clampFreeRange,
  isRangeFree,
  markBusySlots,
  slotRangeToInterval,
} from './slots';

const freeSlots = () => buildDaySlots();

/** Слот 12:00–13:00 занят (ячейки 12:00 … 12:45–13:00) */
const slotsWithNoonBusy = () => markBusySlots(freeSlots(), [{ start: 12 * 60, end: 13 * 60 }]);

describe('buildDaySlots', () => {
  it('покрывает рабочий день слотами шагом 15 минут', () => {
    const slots = buildDaySlots();

    expect(slots).toHaveLength((20 - 9) * 4);
    expect(slots[0]).toMatchObject({ start: 9 * 60, end: 9 * 60 + 15, busy: false });
    expect(slots.at(-1)).toMatchObject({ start: 19 * 60 + 45, end: 20 * 60 });
  });
});

describe('markBusySlots', () => {
  it('помечает только пересекающиеся слоты', () => {
    const slots = markBusySlots(freeSlots(), [{ start: 10 * 60, end: 10 * 60 + 30 }]);

    expect(slots[4]).toMatchObject({ busy: true });
    expect(slots[5]).toMatchObject({ busy: true });
    expect(slots[3]).toMatchObject({ busy: false });
    expect(slots[6]).toMatchObject({ busy: false });
  });

  it('частичное пересечение края бронирования тоже делает слот занятым', () => {
    const slots = markBusySlots(freeSlots(), [{ start: 10 * 60 + 5, end: 10 * 60 + 20 }]);

    expect(slots[4]).toMatchObject({ busy: true });
  });
});

describe('isRangeFree', () => {
  it('ложь, если в диапазон попадает занятый слот', () => {
    const slots = slotsWithNoonBusy();

    expect(isRangeFree(slots, { startIndex: 11, endIndex: 13 })).toBe(false);
    expect(isRangeFree(slots, { startIndex: 0, endIndex: 11 })).toBe(true);
  });
});

describe('clampFreeRange', () => {
  it('расширяет диапазон вперёд до занятого слота', () => {
    const slots = slotsWithNoonBusy();

    // 11:00 → 13:00 упирается в бронирование 12:00
    expect(clampFreeRange(slots, 8, 16)).toEqual({ startIndex: 8, endIndex: 11 });
  });

  it('расширяет диапазон назад от anchor к target', () => {
    const slots = slotsWithNoonBusy();

    // 13:00 → 11:00: anchor 13:00 свободен, назад идём до 12:00
    expect(clampFreeRange(slots, 16, 8)).toEqual({ startIndex: 16, endIndex: 16 });
  });

  it('возвращает null для занятого anchor-слота', () => {
    const slots = slotsWithNoonBusy();

    expect(clampFreeRange(slots, 12, 15)).toBeNull();
  });

  it('не выходит за пределы сетки', () => {
    const slots = freeSlots();

    expect(clampFreeRange(slots, 40, 100)).toEqual({ startIndex: 40, endIndex: 43 });
  });
});

describe('slotRangeToInterval', () => {
  it('переводит диапазон слотов в UTC-интервал таймзоны офиса', () => {
    // Летом Москва = UTC+3: 14:00–15:00 по Москве — это 11:00Z–12:00Z
    expect(
      slotRangeToInterval('2026-08-26', { startIndex: 20, endIndex: 23 }, 'Europe/Moscow'),
    ).toEqual({
      from: '2026-08-26T11:00:00.000Z',
      to: '2026-08-26T12:00:00.000Z',
    });
  });

  it('один слот даёт минимальный интервал 15 минут', () => {
    expect(slotRangeToInterval('2026-08-26', { startIndex: 0, endIndex: 0 }, 'UTC')).toEqual({
      from: '2026-08-26T09:00:00.000Z',
      to: '2026-08-26T09:15:00.000Z',
    });
  });
});
