export { bookingsApi } from './api/bookings-api';
export {
  useGetRoomBookingsQuery,
  useGetMyBookingsQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
} from './api/bookings-api';
export type { RoomBookingsParams } from './api/bookings-api';
export { bookingLocalMinutes, type LocalMinuteInterval } from './lib/local-minutes';
export {
  bookingDay,
  bookingMonth,
  formatBookingFull,
  formatBookingRoom,
  formatBookingTimeRange,
} from './lib/format-booking';
export { buildBookingIcs, toUtcStamp } from './lib/ics';
export type {
  BookingScope,
  BookingView,
  CreateBookingRequest,
  MyBookingsParams,
} from '@shared/api/dto';
