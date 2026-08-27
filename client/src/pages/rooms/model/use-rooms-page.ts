import { skipToken } from '@reduxjs/toolkit/query';

import { useGetRoomsQuery, type RoomSummary } from '@entities/room';
import { useRoomFilters } from '@features/filter-rooms';
import { useOfficeSelector } from '@features/select-office';

export type RoomsContent =
  | { status: 'no-office' }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'empty' }
  | { status: 'success'; rooms: RoomSummary[] };

export interface RoomsPageModel {
  officeSelector: ReturnType<typeof useOfficeSelector>;
  filters: ReturnType<typeof useRoomFilters>;
  // Таймзона выбранного офиса для фильтров
  timezone: string | null;
  content: RoomsContent;
}

export function useRoomsPage(): RoomsPageModel {
  const officeSelector = useOfficeSelector();
  const timezone = officeSelector.selected?.timezone ?? null;
  const filters = useRoomFilters(timezone);

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

  return { officeSelector, filters, timezone, content };
}
