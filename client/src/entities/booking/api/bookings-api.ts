import { baseApi } from '@shared/api/base-api';
import type { BookingView, CreateBookingRequest, MyBookingsParams } from '@shared/api/dto';

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyBookings: build.query<BookingView[], MyBookingsParams | void>({
      query: (params) => ({ url: '/bookings', params: params ?? {} }),
      transformResponse: (response: { items: BookingView[] }) => response.items,
      providesTags: ['MyBookings'],
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

export const { useGetMyBookingsQuery, useCreateBookingMutation, useCancelBookingMutation } =
  bookingsApi;
