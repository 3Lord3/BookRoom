import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useDaySchedule } from './use-day-schedule';
import { createStore } from '../../../app/providers/store';

const ROOM_ID = 'room-everest';
const TIMEZONE = 'Europe/Moscow';

/** Дата ближайшего понедельника — синхронно с фикстурами бронирований */
function nextMonday(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </Provider>
    );
  };
}

function renderSchedule(entry: string) {
  return renderHook(() => useDaySchedule(ROOM_ID, TIMEZONE), {
    wrapper: makeWrapper(entry),
  });
}

/** Свежий success-контент: перечитываем result после каждого действия, т.к. он снапшот рендера */
function content(view: ReturnType<typeof renderSchedule>) {
  const current = view.result.current.content;
  if (current.status !== 'success') {
    throw new Error(`ожидался success, получили ${current.status}`);
  }
  return current;
}

describe('useDaySchedule: выбор интервала', () => {
  it('клик по слоту даёт минимальный интервал, следующий клик расширяет диапазон', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).slots.length).toBeGreaterThan(0));

    act(() => content(view).onPress(20));
    expect(content(view).selection).toEqual({ startIndex: 20, endIndex: 20 });

    act(() => content(view).onPress(23));
    expect(content(view).selection).toEqual({ startIndex: 20, endIndex: 23 });
  });

  it('после перетаскивания следующий клик начинает новый диапазон, а не схлопывает выбор', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).slots.length).toBeGreaterThan(0));

    // Перетаскивание 20 → 22
    act(() => content(view).onPress(20));
    act(() => content(view).onDragOver(22));
    expect(content(view).selection).toEqual({ startIndex: 20, endIndex: 22 });

    // Клик после drag начинает новый интервал с одной ячейки (не расширяет прежний)…
    act(() => content(view).onPress(24));
    expect(content(view).selection).toEqual({ startIndex: 24, endIndex: 24 });

    // …но origin уже снова click, поэтому следующий клик расширяет диапазон
    act(() => content(view).onPress(26));
    expect(content(view).selection).toEqual({ startIndex: 24, endIndex: 26 });
  });

  it('занятый слот сбрасывает выбор', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).slots.length).toBeGreaterThan(0));

    act(() => content(view).onPress(20));
    expect(content(view).selection).not.toBeNull();

    // 18:00–18:15 (индекс 36) занят чужим бронированием из фикстур
    act(() => content(view).onPress(36));
    expect(content(view).selection).toBeNull();
  });
});
