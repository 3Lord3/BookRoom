import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../../../app/app';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';

/** Дата ближайшего понедельника — синхронно с фикстурами бронирований */
function nextMondayIso(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

async function renderRoomDetail(search: string) {
  window.history.replaceState({}, '', search);
  render(<App />);
  return userEvent.setup();
}

describe('RoomDetailPage', () => {
  it('показывает карточку комнаты с фичами и хлебные крошки', async () => {
    await renderRoomDetail('/rooms/room-everest?office=office-moscow');

    expect(await screen.findByRole('heading', { name: 'Эверест' })).toBeInTheDocument();
    expect(screen.getByText('Офис Москва · Москва, ул. Лесная, 7')).toBeInTheDocument();
    expect(screen.getByText('Вместимость: до 12 человек')).toBeInTheDocument();
    expect(screen.getByText('Проектор и ТВ-панель 4К')).toBeInTheDocument();
    expect(screen.getByText('Маркерная доска')).toBeInTheDocument();
    expect(screen.getByText('Система видеоконференций')).toBeInTheDocument();

    const breadcrumbLinks = within(
      screen.getByRole('navigation', { name: 'Хлебные крошки' }),
    ).getAllByRole('link');
    expect(breadcrumbLinks[0]).toHaveAttribute('href', '/rooms');
    expect(breadcrumbLinks[1]).toHaveAttribute('href', '/rooms?office=office-moscow');
    expect(screen.getByText("Комната 'Эверест'")).toBeInTheDocument();
  });

  it('на день с бронированиями показывает своё и чужое события', async () => {
    await renderRoomDetail(`/rooms/room-everest?date=${nextMondayIso()}`);

    // Своё бронирование — с названием, чужое — обезличенный блок «Занято»
    expect(await screen.findByText('Планирование спринта')).toBeInTheDocument();
    expect(screen.getByText('Занято')).toBeInTheDocument();
  });

  it('выбор свободного интервала активирует бронирование и пишет интервал в URL', async () => {
    const user = await renderRoomDetail(`/rooms/room-everest?date=${nextMondayIso()}`);

    const bookButton = await screen.findByRole('button', { name: 'Забронировать комнату' });
    expect(bookButton).toBeDisabled();

    const startCell = screen.getByRole('button', { name: '14:00–14:15 свободно' });
    await user.click(startCell);

    // Один клик даёт минимальный интервал 15 минут
    expect(bookButton).toBeEnabled();

    // Второй клик позже расширяет выбор до 14:00–14:45
    await user.click(screen.getByRole('button', { name: '14:30–14:45 свободно' }));
    expect(screen.getByRole('button', { name: '14:15–14:30 свободно' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(bookButton);

    // Летом Москва = UTC+3: 14:00–14:45 по Москве — это 11:00Z–11:45Z
    const params = new URLSearchParams(window.location.search);
    expect(params.get('from')).toBe(`${nextMondayIso()}T11:00:00.000Z`);
    expect(params.get('to')).toBe(`${nextMondayIso()}T11:45:00.000Z`);
  });

  it('ошибка расписания показывает retry внутри карточки расписания', async () => {
    server.use(errorHandlers.serverError('/rooms/room-everest/bookings'));
    const user = await renderRoomDetail(`/rooms/room-everest?date=${nextMondayIso()}`);

    expect(await screen.findByText('Не удалось загрузить расписание')).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));

    expect(await screen.findByText('Планирование спринта')).toBeInTheDocument();
  });

  it('несуществующая комната показывает сообщение сервера', async () => {
    await renderRoomDetail('/rooms/room-unknown');

    expect(await screen.findByText('Переговорная не найдена')).toBeInTheDocument();
  });
});
