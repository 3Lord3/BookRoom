import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import { useCancelBooking } from './use-cancel-booking';
import { createStore } from '../../../app/providers/store';
import { myBookings } from '../../../mocks/fixtures';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={createStore()}>{children}</Provider>;
}

describe('useCancelBooking', () => {
  const booking = myBookings.upcoming[0]!;

  it('openCancel ставит цель отмены и открывает диалог', () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: Wrapper });

    expect(result.current.target).toBeNull();
    act(() => result.current.openCancel(booking));

    expect(result.current.target).toBe(booking);
  });

  it('dismiss закрывает диалог без запроса', () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: Wrapper });

    act(() => result.current.openCancel(booking));
    act(() => result.current.dismiss());

    expect(result.current.target).toBeNull();
  });

  it('успешная отмена закрывает диалог и показывает тост', async () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: Wrapper });

    act(() => result.current.openCancel(booking));
    await act(() => result.current.confirm());

    expect(result.current.target).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Бронирование отменено');
  });

  it('ошибка отмены оставляет диалог открытым и показывает тост', async () => {
    server.use(errorHandlers.cancelError);
    const { result } = renderHook(() => useCancelBooking(), { wrapper: Wrapper });

    act(() => result.current.openCancel(booking));
    await act(() => result.current.confirm());

    expect(result.current.target).toBe(booking);
    expect(toast.error).toHaveBeenCalledWith('Внутренняя ошибка сервера');
  });
});
