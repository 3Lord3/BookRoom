// DTO REST-контракта бэкенда (/api/v1); общие для нескольких слайсов entities

export interface User {
  id: string;
  login: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

export interface Office {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

export interface RoomFeature {
  code: string;
  name: string;
}

export interface Room {
  id: string;
  officeId: string;
  name: string;
  floor: number;
  capacity: number;
  features: RoomFeature[];
}

// Доступность появляется при фильтрации по интервалу
export interface RoomSummary extends Room {
  office: Office;
  available?: boolean;
}

export type BookingScope = 'upcoming' | 'past' | 'all';

export interface BookingView {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  comment: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  room: Room;
  office: Office;
  owner: User;
}

export interface CreateBookingRequest {
  roomId: string;
  title: string;
  comment?: string | null;
  startsAt: string;
  endsAt: string;
}

export interface MyBookingsParams {
  scope?: BookingScope;
  officeId?: string;
}
