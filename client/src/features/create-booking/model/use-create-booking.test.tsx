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
  it('без create=1 в URL модалка закрыта', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest') },
    );

    expect(result.current.open).toBe(false);
  });

  it('по create=1 открывается пустой формой без интервала', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    expect(result.current.open).toBe(true);
    expect(result.current.form.getValues('date')).toBe('');
    expect(result.current.form.getValues('startTime')).toBe('');
    expect(result.current.summary).toBeNull();
  });

  it('по create=1 с initial форма открывается заполненной интервалом', async () => {
    const { result } = renderHook(
      () =>
        useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест', {
          initial: { date: '2026-08-24', startTime: '10:00', duration: 30 },
        }),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    expect(result.current.open).toBe(true);
    expect(result.current.form.getValues('date')).toBe('2026-08-24');
    expect(result.current.form.getValues('startTime')).toBe('10:00');
    expect(result.current.form.getValues('duration')).toBe(30);
    await waitFor(() => expect(result.current.summary).toContain('10:00 - 10:30'));
  });

  it('close() очищает create из URL и закрывает модалку', () => {
    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it('еженедельный повтор отправляет серию POST с прогрессом', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async () => {
        calls += 1;
        await delay(20);
        return HttpResponse.json(
          { id: `booking-${calls}`, roomId: 'room-everest' },
          { status: 201 },
        );
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
        return HttpResponse.json(
          { id: `booking-${calls}`, roomId: 'room-everest' },
          { status: 201 },
        );
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

  it('повтор «по будням» отправляет серию будних дней без выходных', async () => {
    const sent: string[] = [];
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async ({ request }) => {
        const body = (await request.json()) as { startsAt: string };
        sent.push(body.startsAt);
        return HttpResponse.json(
          { id: `booking-${sent.length}`, roomId: 'room-everest' },
          {
            status: 201,
          },
        );
      }),
    );

    const { result } = renderHook(
      () => useCreateBooking('room-everest', 'Europe/Moscow', 'Эверест'),
      { wrapper: makeWrapper('/rooms/room-everest?create=1') },
    );

    await act(async () => {
      await result.current.submit({
        title: 'Будничный синк',
        date: NEXT_MONDAY,
        startTime: '10:00',
        duration: 30,
        comment: '',
        repeat: 'weekdays',
        occurrences: 3,
      });
    });

    // Понедельник, вторник и среда с 10:00 по Москве
    expect(sent).toEqual([
      '2026-08-24T07:00:00.000Z',
      '2026-08-25T07:00:00.000Z',
      '2026-08-26T07:00:00.000Z',
    ]);
    expect(toast.success).toHaveBeenCalledWith(
      'Бронирование создано',
      expect.objectContaining({ description: expect.stringContaining('3 встречи') }),
    );
  });
});
