import { HttpResponse, delay, http } from 'msw';

import { API_BASE_URL } from '@shared/config/env';

import { myBookings, offices, roomSchedule, rooms, viewer } from './fixtures';

const full = (path: string) => `${API_BASE_URL}${path}`;

export const handlers = [
  http.get(full('/me'), () => HttpResponse.json(viewer)),

  http.get(full('/offices'), () => HttpResponse.json({ items: offices })),

  http.get(full('/rooms'), ({ request }) => {
    const url = new URL(request.url);
    const officeId = url.searchParams.get('officeId');
    const minCapacity = Number(url.searchParams.get('minCapacity'));
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let items = officeId ? rooms.filter((room) => room.officeId === officeId) : rooms;
    if (minCapacity > 0) {
      items = items.filter((room) => room.capacity >= minCapacity);
    }
    // Как в бэкенде: available появляется только при фильтрации по интервалу
    if (from && to) {
      items = items.map((room) => ({
        ...room,
        available: !roomSchedule.some(
          (booking) => booking.roomId === room.id && booking.startsAt < to && booking.endsAt > from,
        ),
      }));
    }
    return HttpResponse.json({ items });
  }),

  http.get(full('/rooms/:roomId'), ({ params }) => {
    const room = rooms.find(({ id }) => id === params.roomId);
    if (!room) {
      return HttpResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Переговорная не найдена' } },
        { status: 404 },
      );
    }
    return HttpResponse.json(room);
  }),

  http.get(full('/rooms/:roomId/bookings'), ({ params, request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    // Бэкенд требует интервал: зеркалим его валидацию, чтобы тесты ловили потерю параметров
    if (!from || !to) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION', message: 'Требуются параметры from и to' } },
        { status: 400 },
      );
    }
    const roomId = params.roomId as string;
    const items = roomSchedule.filter(
      (booking) => booking.roomId === roomId && booking.startsAt < to && booking.endsAt > from,
    );
    return HttpResponse.json({ items });
  }),

  http.get(full('/bookings'), ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') ?? 'upcoming';
    const officeId = url.searchParams.get('officeId');
    let items =
      scope === 'all' ? myBookings.all : scope === 'past' ? myBookings.past : myBookings.upcoming;
    if (officeId) {
      items = items.filter((booking) => booking.office.id === officeId);
    }
    return HttpResponse.json({ items });
  }),

  http.post(full('/bookings'), async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    const room = rooms.find(({ id }) => id === body.roomId);
    if (!room) {
      return HttpResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Переговорная не найдена' } },
        { status: 404 },
      );
    }
    const booking = {
      id: `booking-${Date.now()}`,
      roomId: room.id,
      userId: viewer.id,
      title: body.title,
      comment: body.comment ?? null,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      createdAt: new Date().toISOString(),
      room,
      office: room.office,
      owner: viewer,
    };
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.delete(full('/bookings/:bookingId'), () => new HttpResponse(null, { status: 204 })),
];

/** Хендлеры для тестов ошибок — подключаются через server.use(...) внутри конкретного теста. */
export const errorHandlers = {
  conflict: http.post(full('/bookings'), async () =>
    HttpResponse.json(
      {
        error: {
          code: 'BOOKING_CONFLICT',
          message: 'Переговорная уже забронирована на выбранное время',
          details: { roomId: 'room-everest' },
        },
      },
      { status: 409 },
    ),
  ),
  serverError: (path: string) =>
    http.get(full(path), async () => {
      await delay(50);
      return HttpResponse.json(
        { error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' } },
        { status: 500 },
      );
    }),
  submitError: http.post(full('/bookings'), async () =>
    HttpResponse.json(
      { error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' } },
      { status: 500 },
    ),
  ),
  cancelError: http.delete(full('/bookings/:bookingId'), async () =>
    HttpResponse.json(
      { error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' } },
      { status: 500 },
    ),
  ),
};
