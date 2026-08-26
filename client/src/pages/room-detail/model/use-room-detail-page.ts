import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import { useGetRoomQuery, type RoomSummary } from '@entities/room';
import { toQueryState } from '@shared/api/query-state';

export type RoomDetailContent =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'success'; room: RoomSummary };

export interface RoomDetailPageModel {
  content: RoomDetailContent;
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

  return { content };
}
