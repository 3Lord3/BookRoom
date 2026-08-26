import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useMyBookingsPage } from './use-my-bookings-page';
import { createStore } from '../../../app/providers/store';

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </Provider>
    );
  };
}

describe('useMyBookingsPage', () => {
  it('по умолчанию открыт таб «предстоящие» с будущими бронированиями', async () => {
    const { result } = renderHook(() => useMyBookingsPage(), {
      wrapper: makeWrapper('/bookings'),
    });

    await waitFor(() => expect(result.current.content.status).toBe('success'));

    expect(result.current.tab).toBe('upcoming');
    expect(result.current.upcomingCount).toBe(1);
    if (result.current.content.status === 'success') {
      expect(result.current.content.bookings.map((item) => item.id)).toEqual([
        'booking-future-current-user',
      ]);
    }
  });

  it('setTab(past) переключает список на прошедшие бронирования без refetch', async () => {
    const { result } = renderHook(() => useMyBookingsPage(), {
      wrapper: makeWrapper('/bookings'),
    });

    await waitFor(() => expect(result.current.content.status).toBe('success'));

    act(() => result.current.setTab('past'));

    expect(result.current.tab).toBe('past');
    if (result.current.content.status === 'success') {
      expect(result.current.content.bookings.map((item) => item.id)).toEqual([
        'booking-past-current-user',
      ]);
    }
  });

  it('фильтр офиса передаёт officeId в запрос и учитывается в данных', async () => {
    const { result } = renderHook(() => useMyBookingsPage(), {
      wrapper: makeWrapper('/bookings'),
    });

    await waitFor(() => expect(result.current.content.status).toBe('success'));

    act(() => result.current.officeSelector.select('office-saint-petersburg'));

    await waitFor(() => expect(result.current.content.status).toBe('empty'));

    act(() => result.current.officeSelector.clear());

    await waitFor(() => expect(result.current.content.status).toBe('success'));
  });
});
