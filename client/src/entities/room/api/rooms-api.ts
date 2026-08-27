import { baseApi } from '@shared/api/base-api';
import type { RoomSummary } from '@shared/api/dto';

export interface RoomsListParams {
  officeId: string;
  minCapacity?: number;
  // ISO 8601; from и to передаются только вместе
  from?: string;
  to?: string;
}

export const roomsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRooms: build.query<RoomSummary[], RoomsListParams>({
      query: ({ officeId, minCapacity, from, to }) => ({
        url: '/rooms',
        params: { officeId, minCapacity, from, to },
      }),
      transformResponse: (response: { items: RoomSummary[] }) => response.items,
      providesTags: ['Room'],
    }),
    getRoom: build.query<RoomSummary, string>({
      query: (roomId) => `/rooms/${roomId}`,
      providesTags: (_result, _error, roomId) => [{ type: 'Room', id: roomId }],
    }),
  }),
});

export const { useGetRoomsQuery, useGetRoomQuery } = roomsApi;
