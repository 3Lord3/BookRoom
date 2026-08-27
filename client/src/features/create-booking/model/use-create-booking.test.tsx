import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import { useCreateBooking } from './use-create-booking';
import { createStore } from '../../../app/providers/store';
import { server } from '../../../mocks/server';
import { API_BASE_URL } from '../../../shared/config/env';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

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
    // 11:00Z = 14:00 по Москве летом
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

  it('по create=1 без интервала открывается пустой формой', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    expect(result.current.open).toBe(true);
    expect(result.current.interval).toBeNull();
    expect(result.current.form.getValues('date')).toBe('');
    expect(result.current.summary).toBeNull();
  });

  it('еженедельный повтор отправляет серию POST с прогрессом', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async () => {
        calls += 1;
        await delay(20);
        return HttpResponse.json({ id: `booking-${calls}`, roomId: 'room-everest' }, { status: 201 });
      }),
    );

    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    act(() => {
      void result.current.submit({
        title: 'Еженедельный синк',
        date: NEXT_MONDAY,
        startTime: '10:00',
        duration: 30,
        comment: '',
        repeat: 'weekly',
        occurrences: 3,
      });
    });

    // Пока серия в полёте, виден прогресс
    expect(result.current.progress).toEqual({ done: 0, total: 3 });
    await waitFor(() => expect(result.current.progress).toBeNull());

    expect(calls).toBe(3);
    expect(toast.success).toHaveBeenCalledWith(
      'Бронирование создано',
      expect.objectContaining({ description: expect.stringContaining('3 встречи') }),
    );
  });

  it('при частичном сбое серии показывает сводный тост', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async () => {
        calls += 1;
        if (calls === 2) {
          return HttpResponse.json(
            {
              error: {
                code: 'BOOKING_CONFLICT',
                message: 'Переговорная уже забронирована на выбранное время',
              },
            },
            { status: 409 },
          );
        }
        return HttpResponse.json({ id: `booking-${calls}`, roomId: 'room-everest' }, { status: 201 });
      }),
    );

    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    await act(async () => {
      await result.current.submit({
        title: 'Еженедельный синк',
        date: NEXT_MONDAY,
        startTime: '10:00',
        duration: 30,
        comment: '',
        repeat: 'weekly',
        occurrences: 3,
      });
    });

    expect(calls).toBe(3);
    expect(toast.error).toHaveBeenCalledWith('Созданы не все бронирования', {
      description: 'Создано 2 из 3',
    });
  });
});
