import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useCreateBooking } from './use-create-booking';
import { createStore } from '../../../app/providers/store';

const NEXT_MONDAY = '2026-08-24';

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </Provider>
    );
  };
}

describe('useCreateBooking', () => {
  it('без интервала в URL модалка закрыта', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest') },
    );

    expect(result.current.open).toBe(false);
    expect(result.current.interval).toBeNull();
  });

  it('по интервалу из URL открывается и выводит значения полей в таймзоне офиса', () => {
    // 11:00Z — 14:00 по Москве летом, длительность 1 час
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      {
        wrapper: makeWrapper(
          `/rooms/room-everest?from=${NEXT_MONDAY}T11:00:00.000Z&to=${NEXT_MONDAY}T12:00:00.000Z`,
        ),
      },
    );

    expect(result.current.open).toBe(true);
    expect(result.current.form.getValues('date')).toBe(NEXT_MONDAY);
    expect(result.current.form.getValues('startTime')).toBe('14:00');
    expect(result.current.form.getValues('duration')).toBe(60);
    expect(result.current.summary).toContain('14:00 - 15:00');
  });

  it('close() очищает интервал из URL и закрывает модалку', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      {
        wrapper: makeWrapper(
          `/rooms/room-everest?from=${NEXT_MONDAY}T11:00:00.000Z&to=${NEXT_MONDAY}T12:00:00.000Z`,
        ),
      },
    );

    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });
});