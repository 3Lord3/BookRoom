import { baseApi } from '@shared/api/base-api';
import type { BookingView, CreateBookingRequest, MyBookingsParams } from '@shared/api/dto';

export interface RoomBookingsParams {
  roomId: string;
  // ISO 8601 UTC; бэкенд требует интервал
  from: string;
  to: string;
}

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyBookings: build.query<BookingView[], MyBookingsParams | void>({
      query: (params) => ({ url: '/bookings', params: params ?? {} }),
      transformResponse: (response: { items: BookingView[] }) => response.items,
      providesTags: ['MyBookings'],
    }),
    getRoomBookings: build.query<BookingView[], RoomBookingsParams>({
      query: ({ roomId, from, to }) => ({ url: `/rooms/${roomId}/bookings`, params: { from, to } }),
      transformResponse: (response: { items: BookingView[] }) => response.items,
      providesTags: (_result, _error, { roomId }) => [{ type: 'RoomSchedule', id: roomId }],
    }),
    createBooking: build.mutation<BookingView, CreateBookingRequest>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      invalidatesTags: ['MyBookings', 'Room', 'RoomSchedule'],
    }),
    cancelBooking: build.mutation<void, string>({
      query: (bookingId) => ({ url: `/bookings/${bookingId}`, method: 'DELETE' }),
      invalidatesTags: ['MyBookings', 'Room', 'RoomSchedule'],
      async onQueryStarted(bookingId, { dispatch, getState, queryFulfilled }) {
        // Оптимистичная отмена: бронь исчезает из кэша сразу, при сбое откатывается
        const cachedArgs = bookingsApi.util.selectCachedArgsForQuery(getState(), 'getMyBookings');
        const rollbacks = cachedArgs.map((args) =>
          dispatch(
            bookingsApi.util.updateQueryData('getMyBookings', args, (draft) => {
              const index = draft.findIndex((booking) => booking.id === bookingId);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          rollbacks.forEach((rollback) => rollback.undo());
        }
      },
    }),
  }),
});

export const {
  useGetMyBookingsQuery,
  useGetRoomBookingsQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
} = bookingsApi;
