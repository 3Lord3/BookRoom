import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../../../app/app';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';

// Дата ближайшего понедельника, синхронно с фикстурами
function nextMondayIso(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

async function renderRooms(search = '/rooms') {
  window.history.replaceState({}, '', search);
  render(<App />);
  return userEvent.setup();
}

describe('RoomsPage', () => {
  it('пока офис не выбран показывает empty-state и не запрашивает список', async () => {
    await renderRooms();

    expect(await screen.findByRole('heading', { name: 'Выберите офис' })).toBeInTheDocument();
    expect(screen.queryByText('Эверест')).not.toBeInTheDocument();
  });

  it('показывает карточки комнат выбранного офиса с фичами', async () => {
    await renderRooms('/rooms?office=office-moscow');

    expect(await screen.findByText('Эверест')).toBeInTheDocument();
    expect(screen.getByText('Казбек')).toBeInTheDocument();
  });

  it('фильтр вместимости оставляет только подходящие комнаты', async () => {
    await renderRooms('/rooms?office=office-moscow&capacity=9');

    expect(await screen.findByText('Эверест')).toBeInTheDocument();
    expect(screen.queryByText('Казбек')).not.toBeInTheDocument();
  });

  it('при интервале помечает занятые комнаты как недоступные', async () => {
    // Бронь фикстур: Эверест, понедельник 12:00–13:00 по Москве
    const url = `/rooms?office=office-moscow&date=${nextMondayIso()}&time=12:00&duration=60`;
    await renderRooms(url);

    expect(await screen.findByText('Недоступно на выбранное время')).toBeInTheDocument();
    expect(screen.getByText('Доступно на выбранное время')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Забронировать' })).toBeDisabled();
  });

  it('пустой результат показывает сброс фильтров', async () => {
    const user = await renderRooms('/rooms?office=office-saint-petersburg&capacity=12');

    expect(await screen.findByText('Нет доступных переговорных')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));

    expect(await screen.findByText('Нева')).toBeInTheDocument();
  });

  it('ошибка загрузки предлагает повторить запрос', async () => {
    server.use(errorHandlers.serverError('/rooms'));
    const user = await renderRooms('/rooms?office=office-moscow');

    expect(await screen.findByText('Не удалось загрузить данные')).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));

    await waitFor(() => expect(screen.findByText('Эверест')).resolves.toBeInTheDocument());
  });
});
