import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGetRoomsQuery, type RoomSummary } from '@entities/room';
import { useCreateBooking, type CreateBookingModel } from '@features/create-booking';
import { useRoomFilters } from '@features/filter-rooms';
import { useOfficeSelector } from '@features/select-office';

const BOOKING_PARAM = 'booking';
const CREATE_PARAM = 'create';

export type RoomsContent =
  | { status: 'no-office' }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'empty' }
  | { status: 'success'; rooms: RoomSummary[] };

export interface RoomsBooking {
  model: CreateBookingModel;
  subtitle: string;
  timezone: string;
  book: (room: RoomSummary) => void;
}

export interface RoomsPageModel {
  officeSelector: ReturnType<typeof useOfficeSelector>;
  filters: ReturnType<typeof useRoomFilters>;
  // Таймзона выбранного офиса для фильтров
  timezone: string | null;
  content: RoomsContent;
  booking: RoomsBooking;
}

export function useRoomsPage(): RoomsPageModel {
  const officeSelector = useOfficeSelector();
  const timezone = officeSelector.selected?.timezone ?? null;
  const filters = useRoomFilters(timezone);
  const [searchParams, setSearchParams] = useSearchParams();

  // Без объекта офиса интервал не построить, а запрос без него сразу устаревает
  const roomsResult = useGetRoomsQuery(
    officeSelector.selected
      ? { officeId: officeSelector.selected.id, ...filters.request }
      : skipToken,
  );

  let content: RoomsContent;
  if (!officeSelector.selected) {
    content = { status: 'no-office' };
  } else if (!roomsResult.data) {
    content =
      roomsResult.error !== undefined
        ? { status: 'error', retry: () => void roomsResult.refetch() }
        : { status: 'loading' };
  } else if (roomsResult.data.length === 0) {
    content = { status: 'empty' };
  } else {
    content = { status: 'success', rooms: roomsResult.data };
  }

  const rooms = roomsResult.data ?? [];
  const bookingRoomId = searchParams.get(BOOKING_PARAM);
  const bookingRoom = rooms.find((room) => room.id === bookingRoomId) ?? null;

  // Интервал фильтров подставляется в форму; без него модалка открывается пустой
  const booking = useCreateBooking(
    bookingRoom?.id ?? null,
    bookingRoom?.office.timezone ?? '',
    bookingRoom?.name ?? '',
    {
      initial:
        bookingRoom && filters.date && filters.time
          ? { date: filters.date, startTime: filters.time, duration: filters.duration }
          : undefined,
    },
  );

  // Параметр выбранной комнаты живёт, только пока открыта модалка
  useEffect(() => {
    if (searchParams.get(CREATE_PARAM) !== '1' && searchParams.has(BOOKING_PARAM)) {
      const next = new URLSearchParams(searchParams);
      next.delete(BOOKING_PARAM);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const book = (room: RoomSummary) => {
    const next = new URLSearchParams(searchParams);
    next.set(BOOKING_PARAM, room.id);
    next.set(CREATE_PARAM, '1');
    setSearchParams(next);
  };

  return {
    officeSelector,
    filters,
    timezone,
    content,
    booking: {
      model: booking,
      subtitle: bookingRoom
        ? `Переговорная: ${bookingRoom.name} (${bookingRoom.office.name}, ${bookingRoom.floor} этаж)`
        : '',
      timezone: bookingRoom?.office.timezone ?? '',
      book,
    },
  };
}
