import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import { useGetRoomQuery, type RoomSummary } from '@entities/room';
import { useCreateBooking, type CreateBookingModel } from '@features/create-booking';
import { toQueryState } from '@shared/api/query-state';

export type RoomDetailContent =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'success'; room: RoomSummary };

export interface RoomDetailPageModel {
  content: RoomDetailContent;
  booking: CreateBookingModel;
}

export function useRoomDetailPage(): RoomDetailPageModel {
  const { roomId } = useParams();
  const roomResult = useGetRoomQuery(roomId ?? skipToken);

  const queryState = toQueryState(roomResult);

  let content: RoomDetailContent;
  if (queryState.status === 'loading') {
    content = { status: 'loading' };
  } else if (queryState.status === 'error') {
    content = {
      status: 'error',
      message: queryState.message,
      retry: () => void roomResult.refetch(),
    };
  } else {
    content = { status: 'success', room: queryState.data };
  }

  const room = queryState.status === 'success' ? queryState.data : null;
  const booking = useCreateBooking(
    roomId ?? null,
    room?.office.timezone ?? '',
    room?.name ?? '',
  );

  return { content, booking };
}
