import type { WsEvent } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

// Разбор JSON-сообщения из /api/v1/ws. null — сообщение не является известным
// событием: мусор и частично битые payload серверного контракта не доходят до
// обработчиков
export function parseWsEvent(raw: string): WsEvent | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(message) || typeof message.type !== 'string') {
    return null;
  }

  const occurredAt = asString(message.occurredAt) ?? '';

  switch (message.type) {
    case 'booking.created':
    case 'booking.cancelled': {
      const booking =
        isRecord(message.data) && isRecord(message.data.booking) ? message.data.booking : null;
      const id = booking ? asString(booking.id) : null;
      const roomId = booking ? asString(booking.roomId) : null;
      if (id === null || roomId === null) {
        return null;
      }
      return { type: message.type, occurredAt, data: { booking: { id, roomId } } };
    }
    case 'room.availability_changed': {
      const data = isRecord(message.data) ? message.data : null;
      const roomId = data ? asString(data.roomId) : null;
      const officeId = data ? asString(data.officeId) : null;
      const startsAt = data ? asString(data.startsAt) : null;
      const endsAt = data ? asString(data.endsAt) : null;
      const available = data && typeof data.available === 'boolean' ? data.available : null;
      if (
        roomId === null ||
        officeId === null ||
        startsAt === null ||
        endsAt === null ||
        available === null
      ) {
        return null;
      }
      return {
        type: 'room.availability_changed',
        occurredAt,
        data: { roomId, officeId, startsAt, endsAt, available },
      };
    }
    case 'data.reset':
      return { type: 'data.reset', occurredAt, data: {} };
    default:
      return null;
  }
}
