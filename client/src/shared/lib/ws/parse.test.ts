import { describe, expect, it } from 'vitest';

import { parseWsEvent } from './parse';

describe('parseWsEvent', () => {
  it('разбирает booking.created', () => {
    const event = parseWsEvent(
      JSON.stringify({
        type: 'booking.created',
        occurredAt: '2026-08-19T10:00:00.000Z',
        data: { booking: { id: 'booking-1', roomId: 'room-everest', title: 'Совещание' } },
      }),
    );

    expect(event).toEqual({
      type: 'booking.created',
      occurredAt: '2026-08-19T10:00:00.000Z',
      data: { booking: { id: 'booking-1', roomId: 'room-everest' } },
    });
  });

  it('разбирает booking.cancelled', () => {
    const event = parseWsEvent(
      JSON.stringify({
        type: 'booking.cancelled',
        occurredAt: '2026-08-19T11:00:00.000Z',
        data: { booking: { id: 'booking-1', roomId: 'room-kazbek' } },
      }),
    );

    expect(event).toEqual({
      type: 'booking.cancelled',
      occurredAt: '2026-08-19T11:00:00.000Z',
      data: { booking: { id: 'booking-1', roomId: 'room-kazbek' } },
    });
  });

  it('разбирает room.availability_changed', () => {
    const event = parseWsEvent(
      JSON.stringify({
        type: 'room.availability_changed',
        occurredAt: '2026-08-19T10:00:00.000Z',
        data: {
          roomId: 'room-everest',
          officeId: 'office-moscow',
          startsAt: '2026-08-19T10:00:00.000Z',
          endsAt: '2026-08-19T11:00:00.000Z',
          available: false,
        },
      }),
    );

    expect(event).toEqual({
      type: 'room.availability_changed',
      occurredAt: '2026-08-19T10:00:00.000Z',
      data: {
        roomId: 'room-everest',
        officeId: 'office-moscow',
        startsAt: '2026-08-19T10:00:00.000Z',
        endsAt: '2026-08-19T11:00:00.000Z',
        available: false,
      },
    });
  });

  it('разбирает data.reset', () => {
    const event = parseWsEvent(
      JSON.stringify({ type: 'data.reset', occurredAt: '2026-08-19T10:00:00.000Z', data: {} }),
    );

    expect(event).toEqual({ type: 'data.reset', occurredAt: '2026-08-19T10:00:00.000Z', data: {} });
  });

  it('возвращает null для не-JSON сообщения', () => {
    expect(parseWsEvent('not a json')).toBeNull();
  });

  it('возвращает null для неизвестного типа', () => {
    expect(parseWsEvent(JSON.stringify({ type: 'message.created', data: {} }))).toBeNull();
  });

  it('возвращает null при повреждённом payload booking', () => {
    expect(
      parseWsEvent(JSON.stringify({ type: 'booking.created', data: { booking: {} } })),
    ).toBeNull();
    expect(
      parseWsEvent(JSON.stringify({ type: 'booking.created', data: { booking: { id: 'b1' } } })),
    ).toBeNull();
  });

  it('возвращает null при повреждённом payload availability', () => {
    expect(
      parseWsEvent(
        JSON.stringify({
          type: 'room.availability_changed',
          data: { roomId: 'room-everest', available: 'yes' },
        }),
      ),
    ).toBeNull();
  });
});
