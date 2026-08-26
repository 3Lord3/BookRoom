import type { BookingScope, BookingView, Office, RoomSummary, User } from '@shared/api/dto';

/**
 * Фикстуры повторяют seed предоставленного бэкенда,
 * чтобы тесты и dev-данные не расходились.
 */

export const viewer: User = {
  id: 'user-konstantin',
  login: 'kkuznetsov',
  displayName: 'Константин Кузнецов',
  email: 'kkuznetsov@example.test',
  avatarUrl: null,
  initials: 'КК',
};

export const offices: Office[] = [
  {
    id: 'office-moscow',
    name: 'Офис Москва',
    address: 'Москва, ул. Лесная, 7',
    timezone: 'Europe/Moscow',
  },
  {
    id: 'office-saint-petersburg',
    name: 'Офис Санкт-Петербург',
    address: 'Санкт-Петербург, наб. реки Карповки, 5',
    timezone: 'Europe/Moscow',
  },
];

const moscowOffice = offices[0]!;
const spbOffice = offices[1]!;

export const rooms: RoomSummary[] = [
  {
    id: 'room-everest',
    officeId: 'office-moscow',
    name: 'Эверест',
    floor: 4,
    capacity: 12,
    features: [
      { code: 'display', name: 'Проектор и ТВ-панель 4К' },
      { code: 'whiteboard', name: 'Маркерная доска' },
      { code: 'video', name: 'Система видеоконференций' },
    ],
    office: moscowOffice,
  },
  {
    id: 'room-kazbek',
    officeId: 'office-moscow',
    name: 'Казбек',
    floor: 3,
    capacity: 8,
    features: [
      { code: 'display', name: 'ТВ-панель' },
      { code: 'whiteboard', name: 'Маркерная доска' },
    ],
    office: moscowOffice,
  },
  {
    id: 'room-neva',
    officeId: 'office-saint-petersburg',
    name: 'Нева',
    floor: 6,
    capacity: 10,
    features: [
      { code: 'display', name: 'ТВ-панель' },
      { code: 'video', name: 'Система видеоконференций' },
    ],
    office: spbOffice,
  },
];

const HOUR_MS = 60 * 60 * 1000;

/** Ближайший будущий понедельник, hourUtc:00 UTC — стабильно «в будущем» */
function futureIso(hourUtc: number): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.toISOString();
}

function pastIso(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 2);
  date.setUTCHours(10, 0, 0, 0);
  return date.toISOString();
}

const everest = rooms[0]!;
const futureStart = futureIso(9);
const pastStart = pastIso();

export const myBookings: Record<BookingScope, BookingView[]> = {
  all: [
    {
      id: 'booking-future-current-user',
      roomId: everest.id,
      userId: viewer.id,
      title: 'Планирование спринта',
      comment: null,
      startsAt: futureStart,
      endsAt: new Date(new Date(futureStart).getTime() + HOUR_MS).toISOString(),
      createdAt: new Date().toISOString(),
      room: everest,
      office: everest.office,
      owner: viewer,
    },
    {
      id: 'booking-past-current-user',
      roomId: everest.id,
      userId: viewer.id,
      title: 'Ретроспектива',
      comment: 'Разбираем прошлый спринт',
      startsAt: pastStart,
      endsAt: new Date(new Date(pastStart).getTime() + HOUR_MS).toISOString(),
      createdAt: new Date().toISOString(),
      room: everest,
      office: everest.office,
      owner: viewer,
    },
  ],
  upcoming: [],
  past: [],
};

myBookings.upcoming = [myBookings.all[0]!];
myBookings.past = [myBookings.all[1]!];

/** Чужое бронирование — для блока «Занято» в расписании комнаты */
const colleague: User = {
  id: 'user-mariya',
  login: 'morlova',
  displayName: 'Мария Орлова',
  email: 'morlova@example.test',
  avatarUrl: null,
  initials: 'МО',
};

// Тот же будущий понедельник, 15:00Z — 18:00–19:00 по Москве
const colleagueStart = futureIso(15);

export const roomSchedule: BookingView[] = [
  ...myBookings.all,
  {
    id: 'booking-future-colleague',
    roomId: everest.id,
    userId: colleague.id,
    title: 'Daily Sync / Команда разработки',
    comment: null,
    startsAt: colleagueStart,
    endsAt: new Date(new Date(colleagueStart).getTime() + HOUR_MS).toISOString(),
    createdAt: new Date().toISOString(),
    room: everest,
    office: everest.office,
    owner: colleague,
  },
];
