import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { bookingsApi } from '@entities/booking';
import { officesApi } from '@entities/office';
import { roomsApi } from '@entities/room';
import { viewerApi } from '@entities/viewer';
import { API_BASE_URL } from '@shared/config/env';
import type { WsConnectionStatus, WsEvent } from '@shared/lib/ws';

import { selectConnectionStatus } from './connection-status-slice';
import { realTimeStarted, realTimeStopped } from './real-time-sync';
import { createStore } from '../../../app/providers/store';
import { offices, rooms, viewer } from '../../../mocks/fixtures';
import { server } from '../../../mocks/server';

const full = (path: string) => `${API_BASE_URL}${path}`;
const FROM = '2026-08-19T10:00:00.000Z';
const TO = '2026-08-19T11:00:00.000Z';
const OCCURRED_AT = '2026-08-19T10:00:00.000Z';

function createFakeWsClient() {
  const handlers = new Set<(event: WsEvent) => void>();
  const statusHandlers = new Set<(status: WsConnectionStatus) => void>();
  const state = { connects: 0, closes: 0, status: 'disconnected' as WsConnectionStatus };

  const emitStatus = (status: WsConnectionStatus) => {
    state.status = status;
    statusHandlers.forEach((handler) => handler(status));
  };

  return {
    get connects(): number {
      return state.connects;
    },
    get closes(): number {
      return state.closes;
    },
    get subscribers(): number {
      return handlers.size;
    },
    connect: () => {
      state.connects += 1;
      emitStatus('connecting');
      emitStatus('connected');
    },
    close: () => {
      state.closes += 1;
      emitStatus('disconnected');
    },
    subscribe: (handler: (event: WsEvent) => void) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    subscribeStatus: (handler: (status: WsConnectionStatus) => void) => {
      statusHandlers.add(handler);
      handler(state.status);
      return () => {
        statusHandlers.delete(handler);
      };
    },
    emit: (event: WsEvent) => handlers.forEach((handler) => handler(event)),
    emitStatus,
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Таймаут ожидания условия');
}

async function setup() {
  const ws = createFakeWsClient();
  const store = createStore({ wsClient: ws });
  store.dispatch(realTimeStarted());
  await flush();
  return { store, ws };
}

describe('real-time-sync middleware', () => {
  it('realTimeStarted подключает клиент', async () => {
    const { ws } = await setup();

    expect(ws.connects).toBe(1);
    expect(ws.subscribers).toBe(1);
  });

  it('realTimeStopped отписывает и закрывает соединение', async () => {
    const { store, ws } = await setup();

    store.dispatch(realTimeStopped());
    await flush();

    expect(ws.subscribers).toBe(0);
    expect(ws.closes).toBe(1);
    expect(selectConnectionStatus(store.getState())).toBe('disconnected');
  });

  it('статус соединения сохраняется в стор', async () => {
    const { store, ws } = await setup();

    expect(selectConnectionStatus(store.getState())).toBe('connected');

    ws.emitStatus('reconnecting');

    expect(selectConnectionStatus(store.getState())).toBe('reconnecting');
  });

  it('после reconnect перезапрашивается весь активный кэш', async () => {
    const counters = { rooms: 0, myBookings: 0 };
    server.use(
      http.get(full('/rooms'), () => {
        counters.rooms += 1;
        return HttpResponse.json({ items: rooms });
      }),
      http.get(full('/bookings'), () => {
        counters.myBookings += 1;
        return HttpResponse.json({ items: [] });
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(roomsApi.endpoints.getRooms.initiate({ officeId: 'office-moscow' }));
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate({ scope: 'all' }));
    expect(counters.rooms).toBe(1);
    expect(counters.myBookings).toBe(1);

    // установленное соединение теряется и восстанавливается
    ws.emitStatus('reconnecting');
    ws.emitStatus('connected');

    await waitFor(() => counters.rooms >= 2 && counters.myBookings >= 2);
  });

  it('booking.created перезапрашивает расписание комнаты и мои бронирования', async () => {
    const counters = { schedule: 0, myBookings: 0 };
    server.use(
      http.get(full('/rooms/:roomId/bookings'), () => {
        counters.schedule += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(full('/bookings'), () => {
        counters.myBookings += 1;
        return HttpResponse.json({ items: [] });
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(
      bookingsApi.endpoints.getRoomBookings.initiate({
        roomId: 'room-everest',
        from: FROM,
        to: TO,
      }),
    );
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate({ scope: 'all' }));
    expect(counters.schedule).toBe(1);
    expect(counters.myBookings).toBe(1);

    ws.emit({
      type: 'booking.created',
      occurredAt: OCCURRED_AT,
      data: { booking: { id: 'booking-new', roomId: 'room-everest' } },
    });

    await waitFor(() => counters.schedule >= 2 && counters.myBookings >= 2);
  });

  it('booking.cancelled перезапрашивает расписание комнаты и мои бронирования', async () => {
    const counters = { schedule: 0, myBookings: 0 };
    server.use(
      http.get(full('/rooms/:roomId/bookings'), () => {
        counters.schedule += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(full('/bookings'), () => {
        counters.myBookings += 1;
        return HttpResponse.json({ items: [] });
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(
      bookingsApi.endpoints.getRoomBookings.initiate({
        roomId: 'room-everest',
        from: FROM,
        to: TO,
      }),
    );
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate({ scope: 'all' }));

    ws.emit({
      type: 'booking.cancelled',
      occurredAt: OCCURRED_AT,
      data: { booking: { id: 'booking-existing', roomId: 'room-everest' } },
    });

    await waitFor(() => counters.schedule >= 2 && counters.myBookings >= 2);
  });

  it('booking.created перезапрашивает весь список комнат', async () => {
    const counters = { rooms: 0 };
    server.use(
      http.get(full('/rooms'), () => {
        counters.rooms += 1;
        return HttpResponse.json({ items: rooms });
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(roomsApi.endpoints.getRooms.initiate({ officeId: 'office-moscow' }));
    expect(counters.rooms).toBe(1);

    ws.emit({
      type: 'booking.created',
      occurredAt: OCCURRED_AT,
      data: { booking: { id: 'booking-new', roomId: 'room-everest' } },
    });

    await waitFor(() => counters.rooms >= 2);
  });

  it('booking.cancelled перезапрашивает весь список комнат', async () => {
    const counters = { rooms: 0 };
    server.use(
      http.get(full('/rooms'), () => {
        counters.rooms += 1;
        return HttpResponse.json({ items: rooms });
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(roomsApi.endpoints.getRooms.initiate({ officeId: 'office-moscow' }));
    expect(counters.rooms).toBe(1);

    ws.emit({
      type: 'booking.cancelled',
      occurredAt: OCCURRED_AT,
      data: { booking: { id: 'booking-existing', roomId: 'room-everest' } },
    });

    await waitFor(() => counters.rooms >= 2);
  });

  it('room.availability_changed перезапрашивает список комнат и обновляет available', async () => {
    let call = 0;
    server.use(
      http.get(full('/rooms'), () => {
        call += 1;
        const available = call === 1;
        return HttpResponse.json({ items: rooms.map((room) => ({ ...room, available })) });
      }),
    );

    const { store, ws } = await setup();
    const args = { officeId: 'office-moscow', from: FROM, to: TO };
    await store.dispatch(roomsApi.endpoints.getRooms.initiate(args));
    expect(roomsApi.endpoints.getRooms.select(args)(store.getState()).data?.[0]?.available).toBe(
      true,
    );

    ws.emit({
      type: 'room.availability_changed',
      occurredAt: OCCURRED_AT,
      data: {
        roomId: 'room-everest',
        officeId: 'office-moscow',
        startsAt: FROM,
        endsAt: TO,
        available: false,
      },
    });

    await waitFor(() => call >= 2);
    expect(roomsApi.endpoints.getRooms.select(args)(store.getState()).data?.[0]?.available).toBe(
      false,
    );
  });

  it('data.reset перезапрашивает весь активный кэш', async () => {
    const counters = { rooms: 0, schedule: 0, myBookings: 0, offices: 0, viewer: 0 };
    server.use(
      http.get(full('/rooms'), () => {
        counters.rooms += 1;
        return HttpResponse.json({ items: rooms });
      }),
      http.get(full('/rooms/:roomId/bookings'), () => {
        counters.schedule += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(full('/bookings'), () => {
        counters.myBookings += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(full('/offices'), () => {
        counters.offices += 1;
        return HttpResponse.json({ items: offices });
      }),
      http.get(full('/me'), () => {
        counters.viewer += 1;
        return HttpResponse.json(viewer);
      }),
    );

    const { store, ws } = await setup();
    await store.dispatch(roomsApi.endpoints.getRooms.initiate({ officeId: 'office-moscow' }));
    await store.dispatch(
      bookingsApi.endpoints.getRoomBookings.initiate({
        roomId: 'room-everest',
        from: FROM,
        to: TO,
      }),
    );
    await store.dispatch(bookingsApi.endpoints.getMyBookings.initiate({ scope: 'all' }));
    await store.dispatch(officesApi.endpoints.getOffices.initiate());
    await store.dispatch(viewerApi.endpoints.getViewer.initiate());

    ws.emit({ type: 'data.reset', occurredAt: OCCURRED_AT, data: {} });

    await waitFor(
      () =>
        counters.rooms >= 2 &&
        counters.schedule >= 2 &&
        counters.myBookings >= 2 &&
        counters.offices >= 2 &&
        counters.viewer >= 2,
    );
  });
});
