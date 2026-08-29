import { render, screen, waitFor, within } from '@testing-library/react';
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
    const everestCard = screen.getByText('Эверест').closest('article') as HTMLElement;
    expect(within(everestCard).getByRole('button', { name: 'Забронировать' })).toBeDisabled();
  });

  it('забронировать на доступном интервале открывает модалку со значениями из фильтров', async () => {
    const monday = nextMondayIso();
    const user = await renderRooms(
      `/rooms?office=office-moscow&date=${monday}&time=14:00&duration=60`,
    );

    const kazbekCard = (await screen.findByText('Казбек')).closest('article') as HTMLElement;
    await user.click(within(kazbekCard).getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
    // Сводка собрана из подставленных фильтров: 14:00–15:00 по таймзоне офиса
    expect(screen.getByText(/14:00 - 15:00 \(1 час\)/)).toBeInTheDocument();

    const params = new URLSearchParams(window.location.search);
    expect(params.get('create')).toBe('1');
    expect(params.get('booking')).toBe('room-kazbek');
  });

  it('отмена модалки из списка закрывает её без ошибок', async () => {
    const monday = nextMondayIso();
    const user = await renderRooms(
      `/rooms?office=office-moscow&date=${monday}&time=14:00&duration=60`,
    );

    const kazbekCard = (await screen.findByText('Казбек')).closest('article') as HTMLElement;
    await user.click(within(kazbekCard).getByRole('button', { name: 'Забронировать' }));
    expect(await screen.findByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument(),
    );
    expect(new URLSearchParams(window.location.search).get('booking')).toBeNull();
  });

  it('ссылка с booking и create открывает модалку после загрузки списка', async () => {
    await renderRooms('/rooms?office=office-moscow&booking=room-kazbek&create=1');

    // Пока список грузится, параметры трогать нельзя: комнаты ещё нет в данных
    expect(await screen.findByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('booking')).toBe('room-kazbek');
    expect(params.get('create')).toBe('1');
  });

  it('несуществующая комната в ссылке убирает booking и create из URL', async () => {
    await renderRooms('/rooms?office=office-moscow&booking=room-gone&create=1');

    expect(await screen.findByText('Эверест')).toBeInTheDocument();
    // Иначе оба параметра остаются в URL навсегда и уезжают по ссылке «Подробнее»
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('booking')).toBeNull();
      expect(params.get('create')).toBeNull();
    });
    expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument();
  });

  it('одинокий create в ссылке не уезжает на страницу комнаты', async () => {
    const user = await renderRooms('/rooms?office=office-moscow&create=1');

    expect(await screen.findByText('Эверест')).toBeInTheDocument();
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('create')).toBeNull(),
    );

    // Страница комнаты открывает модалку по одному create=1: параметр не должен
    // уехать туда по ссылке «Подробнее» и открыть бронирование невыбранной комнаты
    const everestCard = screen.getByText('Эверест').closest('article') as HTMLElement;
    await user.click(within(everestCard).getByRole('link', { name: 'Подробнее' }));

    expect(await screen.findByRole('heading', { name: 'Эверест' })).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('create')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument();
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
