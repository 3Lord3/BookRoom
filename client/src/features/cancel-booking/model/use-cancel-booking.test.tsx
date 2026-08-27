import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { Provider } from 'react-redux';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import { bookingsApi } from '@entities/booking';
import { API_BASE_URL } from '@shared/config/env';

import { useCancelBooking } from './use-cancel-booking';
import { createStore, type AppStore } from '../../../app/providers/store';
import { myBookings } from '../../../mocks/fixtures';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const QUERY_ARGS = { scope: 'all' as const };

function setup() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const { result } = renderHook(() => useCancelBooking(), { wrapper });
  return { store, result };
}

const selectBookings = (store: AppStore) =>
  bookingsApi.endpoints.getMyBookings.select(QUERY_ARGS)(store.getState()).data ?? [];

describe('useCancelBooking', () => {
  const booking = myBookings.upcoming[0]!;

  it('openCancel ставит цель отмены и открывает диалог', () => {
    const { result } = setup();

    expect(result.current.target).toBeNull();
    act(() => result.current.openCancel(booking));

    expect(result.current.target).toBe(booking);
  });

  it('dismiss закрывает диалог без запроса', () => {
    const { result } = setup();

    act(() => result.current.openCancel(booking));
    act(() => result.current.dismiss());

    expect(result.current.target).toBeNull();
  });

  it('успешная отмена закрывает диалог и показывает тост', async () => {
    const { store, result } = setup();
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate(QUERY_ARGS));

    act(() => result.current.openCancel(booking));
    await act(() => result.current.confirm());

    expect(result.current.target).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Бронирование отменено');
  });

  it('ошибка отмены оставляет диалог открытым и показывает тост', async () => {
    server.use(errorHandlers.cancelError);
    const { store, result } = setup();
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate(QUERY_ARGS));

    act(() => result.current.openCancel(booking));
    await act(() => result.current.confirm());

    expect(result.current.target).toBe(booking);
    expect(toast.error).toHaveBeenCalledWith('Внутренняя ошибка сервера');
  });

  it('оптимистично удаляет бронирование из кэша до ответа сервера', async () => {
    // Задержка DELETE, чтобы успеть проверить кэш во время запроса
    server.use(
      http.delete(`${API_BASE_URL}/bookings/:bookingId`, async () => {
        await delay(50);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { store, result } = setup();
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate(QUERY_ARGS));
    expect(selectBookings(store).some((item) => item.id === booking.id)).toBe(true);

    act(() => result.current.openCancel(booking));
    act(() => {
      void result.current.confirm();
    });

    // Во время DELETE бронь уже исчезла из списка
    expect(selectBookings(store).some((item) => item.id === booking.id)).toBe(false);

    await waitFor(() => expect(result.current.target).toBeNull());
  });

  it('при ошибке откатывает оптимистичное удаление', async () => {
    server.use(errorHandlers.cancelError);
    const { store, result } = setup();
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate(QUERY_ARGS));

    act(() => result.current.openCancel(booking));
    await act(() => result.current.confirm());

    // Отмена не прошла, бронь вернулась в кэш
    expect(selectBookings(store).some((item) => item.id === booking.id)).toBe(true);
    expect(result.current.target).toBe(booking);
  });
});