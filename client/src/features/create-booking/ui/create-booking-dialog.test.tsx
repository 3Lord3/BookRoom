import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { App } from '../../../app/app';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';
import { API_BASE_URL } from '../../../shared/config/env';

/** Дата ближайшего понедельника — синхронно с фикстурами бронирований */
function nextMondayIso(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

async function renderDialog() {
  const monday = nextMondayIso();
  // Интервал 14:00–15:00 по Москве (11:00Z–12:00Z) — открывает модалку
  window.history.replaceState(
    {},
    '',
    `/rooms/room-everest?date=${monday}&from=${monday}T11:00:00.000Z&to=${monday}T12:00:00.000Z`,
  );
  render(<App />);
  const user = userEvent.setup();
  const title = await screen.findByRole('heading', { name: 'Новое бронирование' });
  return { user, title, monday };
}

describe('CreateBookingDialog', () => {
  it('показывает форму с интервалом из URL и сводкой в таймзоне офиса', async () => {
    const { title } = await renderDialog();

    expect(title).toBeInTheDocument();
    expect(screen.getByText('Переговорная: Эверест (Офис Москва, 4 этаж)')).toBeInTheDocument();
    // Летом Москва = UTC+3: 11:00Z — 14:00 по Москве, ближайший понедельник
    expect(screen.getByText('Тема встречи *')).toBeInTheDocument();
    expect(screen.getByText(/Бронирование на Понедельник/)).toBeInTheDocument();
    expect(screen.getByText(/14:00 - 15:00 \(1 час\)/)).toBeInTheDocument();
  });

  it('создаёт бронирование: POST, тост успеха и закрытие модалки', async () => {
    const { user, monday } = await renderDialog();

    const sentBody: Record<string, unknown>[] = [];
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async ({ request }) => {
        sentBody.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 'booking-new', roomId: 'room-everest' }, { status: 201 });
      }),
    );

    await user.type(screen.getByLabelText('Тема встречи *'), 'Обсуждение плана');
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Бронирование создано')).toBeInTheDocument();
    expect(sentBody).toHaveLength(1);
    expect(sentBody[0]).toMatchObject({
      roomId: 'room-everest',
      title: 'Обсуждение плана',
      startsAt: `${monday}T11:00:00.000Z`,
      endsAt: `${monday}T12:00:00.000Z`,
    });

    // Модалка закрылась, интервал ушёл из URL
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument(),
    );
    const params = new URLSearchParams(window.location.search);
    expect(params.get('from')).toBeNull();
    expect(params.get('to')).toBeNull();
  });

  it('при 409 показывает отдельное состояние конфликта', async () => {
    const { user } = await renderDialog();
    server.use(errorHandlers.conflict);

    await user.type(screen.getByLabelText('Тема встречи *'), 'Конфликтная бронь');
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Время уже занято')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Выбранный интервал был забронирован другим сотрудником. Расписание обновлено.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Выбрать другое время' }));
    expect(screen.queryByText('Время уже занято')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument();
  });

  it('при ошибке сервера (не 409) показывает тост с сообщением', async () => {
    const { user } = await renderDialog();
    server.use(errorHandlers.submitError);

    await user.type(screen.getByLabelText('Тема встречи *'), 'Сбой брони');
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Внутренняя ошибка сервера')).toBeInTheDocument();
    // Модалка остаётся открытой, чтобы можно было повторить попытку
    expect(screen.getByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
  });

  it('пустая тема показывает ошибку и не отправляет запрос', async () => {
    const { user } = await renderDialog();

    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Обязательное поле')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
  });

  it('кнопка «Отмена» закрывает модалку и убирает интервал из URL', async () => {
    const { user } = await renderDialog();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('from')).toBeNull();
    expect(params.get('to')).toBeNull();
  });

  it('сводка пересчитывается при смене длительности', async () => {
    const { user } = await renderDialog();

    const summary = await screen.findByText(/Бронирование на /);
    expect(summary).toHaveTextContent('(1 час)');

    await user.click(screen.getByRole('combobox', { name: 'Продолжительность' }));
    await user.click(within(screen.getByRole('listbox')).getByText('30 мин (до 14:30)'));

    expect(await screen.findByText(/Бронирование на /)).toHaveTextContent('(30 мин)');
  });
});
