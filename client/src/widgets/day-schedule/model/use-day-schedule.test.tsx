import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useDaySchedule } from './use-day-schedule';
import { createStore } from '../../../app/providers/store';

const ROOM_ID = 'room-everest';
const TIMEZONE = 'Europe/Moscow';

// Дата ближайшего понедельника, синхронно с фикстурами
function nextMonday(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// MemoryRouter не пишет в window.location, поиск читаем из текущего роута
let currentSearch = '';

function LocationProbe() {
  const location = useLocation();
  useEffect(() => {
    currentSearch = location.search;
  }, [location.search]);
  return null;
}

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <LocationProbe />
          {children}
        </MemoryRouter>
      </Provider>
    );
  };
}

function renderSchedule(entry: string) {
  return renderHook(() => useDaySchedule(ROOM_ID, TIMEZONE), {
    wrapper: makeWrapper(entry),
  });
}

// result снапшот рендера, перечитываем его после каждого действия
function content(view: ReturnType<typeof renderSchedule>) {
  const current = view.result.current.content;
  if (current.status !== 'success') {
    throw new Error(`ожидался success, получили ${current.status}`);
  }
  return current;
}

describe('useDaySchedule', () => {
  it('загружает события дня и отличает своё бронирование от чужого', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).events.length).toBeGreaterThan(0));

    const events = content(view).events;
    expect(events.some((event) => event.kind === 'own')).toBe(true);
    expect(events.some((event) => event.kind === 'other')).toBe(true);
  });

  it('book открывает форму без интервала: только ?create=1', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).events.length).toBeGreaterThan(0));

    act(() => content(view).book());

    const params = new URLSearchParams(currentSearch);
    expect(params.get('create')).toBe('1');
    expect(params.get('from')).toBeNull();
    expect(params.get('to')).toBeNull();
  });

  it('selectDate обновляет дату в URL', async () => {
    const view = renderSchedule(`/rooms/${ROOM_ID}?date=${nextMonday()}`);
    await waitFor(() => expect(content(view).events.length).toBeGreaterThan(0));

    const other = '2026-08-30';
    act(() => view.result.current.selectDate(other));

    const params = new URLSearchParams(currentSearch);
    expect(params.get('date')).toBe(other);
  });
});