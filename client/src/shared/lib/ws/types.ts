// Снимок бронирования в WS-событиях: поля, которые реально читает клиент
export interface BookingEventPayload {
  id: string;
  roomId: string;
}

// Доступность комнаты на интервале после создания или отмены бронирования
export interface RoomAvailabilityChange {
  roomId: string;
  officeId: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
}

// События broadcast-канала /api/v1/ws — дискриминированный union по полю type
export type WsEvent =
  | { type: 'booking.created'; occurredAt: string; data: { booking: BookingEventPayload } }
  | { type: 'booking.cancelled'; occurredAt: string; data: { booking: BookingEventPayload } }
  | { type: 'room.availability_changed'; occurredAt: string; data: RoomAvailabilityChange }
  | { type: 'data.reset'; occurredAt: string; data: Record<string, never> };
