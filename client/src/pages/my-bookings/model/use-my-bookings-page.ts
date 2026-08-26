import { useSearchParams } from 'react-router-dom';

import { useGetMyBookingsQuery, type BookingView } from '@entities/booking';
import { useCancelBooking, type CancelBookingModel } from '@features/cancel-booking';
import { useOfficeSelector } from '@features/select-office';

import { splitBookings } from '../lib/split-bookings';

const TAB_KEY = 'tab';

export type MyBookingsTab = 'upcoming' | 'past';

export type MyBookingsContent =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'empty' }
  | { status: 'success'; bookings: BookingView[] };

export interface MyBookingsPageModel {
  officeSelector: ReturnType<typeof useOfficeSelector>;
  tab: MyBookingsTab;
  setTab: (tab: MyBookingsTab) => void;
  /** Для подписи таба «Предстоящие (N)» */
  upcomingCount: number;
  content: MyBookingsContent;
  cancel: CancelBookingModel;
}

/**
 * «Мои бронирования». Оба таба обслуживаются одним запросом scope=all —
 * так подпись «Предстоящие (N)» не требует второго запроса, а переключение
 * таба происходит без refetch.
 */
export function useMyBookingsPage(): MyBookingsPageModel {
  const [searchParams, setSearchParams] = useSearchParams();
  const officeSelector = useOfficeSelector();
  const cancel = useCancelBooking();

  const tab: MyBookingsTab = searchParams.get(TAB_KEY) === 'past' ? 'past' : 'upcoming';

  const setTab = (value: MyBookingsTab) => {
    const next = new URLSearchParams(searchParams);
    next.set(TAB_KEY, value);
    setSearchParams(next);
  };

  const query = officeSelector.selected
    ? { scope: 'all' as const, officeId: officeSelector.selected.id }
    : { scope: 'all' as const };
  const bookingsResult = useGetMyBookingsQuery(query);

  let content: MyBookingsContent;
  let upcomingCount = 0;
  if (bookingsResult.isLoading) {
    content = { status: 'loading' };
  } else if (bookingsResult.error !== undefined) {
    content = { status: 'error', retry: () => void bookingsResult.refetch() };
  } else {
    const split = splitBookings(bookingsResult.data ?? []);
    upcomingCount = split.upcoming.length;
    const items = tab === 'past' ? split.past : split.upcoming;
    content = items.length === 0 ? { status: 'empty' } : { status: 'success', bookings: items };
  }

  return { officeSelector, tab, setTab, upcomingCount, content, cancel };
}
