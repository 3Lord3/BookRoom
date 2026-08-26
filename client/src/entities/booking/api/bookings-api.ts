import { baseApi } from '@shared/api/base-api';
import type { BookingView, CreateBookingRequest, MyBookingsParams } from '@shared/api/dto';

export interface RoomBookingsParams {
  roomId: string;
  /** ISO 8601 в UTC; бэкенд требует интервал */
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
    }),
  }),
});

export const {
  useGetMyBookingsQuery,
  useGetRoomBookingsQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
} = bookingsApi;
