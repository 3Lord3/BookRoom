import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../../app/app';
import { myBookings } from '../../../mocks/fixtures';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';
import { API_BASE_URL } from '../../../shared/config/env';

async function renderBookings() {
  window.history.replaceState({}, '', '/bookings');
  render(<App />);
  return userEvent.setup();
}

describe('MyBookingsPage', () => {
  it('показывает предстоящие бронирования с кнопкой отмены', async () => {
    await renderBookings();

    expect(await screen.findByRole('heading', { name: 'Мои бронирования' })).toBeInTheDocument();

    expect(await screen.findByText('Планирование спринта')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Предстоящие (1)' })).toBeInTheDocument();
    expect(screen.getByText('Эверест')).toBeInTheDocument();
    expect(screen.getByText('4 этаж')).toBeInTheDocument();
    // 09:00Z = 12:00 по Москве летом; аббревиатура зависит от окружения
    expect(screen.getByText(/^12:00 - 13:00 /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Скачать \.ics/ })).toBeInTheDocument();
  });

  it('«Скачать .ics» экспортирует встречу и показывает уведомление', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = await renderBookings();

    await user.click(await screen.findByRole('button', { name: /Скачать \.ics/ }));

    expect(await screen.findByText('Файл .ics сохранён')).toBeInTheDocument();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect((clickSpy.mock.instances[0] as HTMLAnchorElement).download).toBe(
      'Планирование спринта.ics',
    );
    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('text/calendar;charset=utf-8');
  });

  it('переключение на «Прошедшие» показывает прошлые бронирования без отмены', async () => {
    const user = await renderBookings();

    await user.click(await screen.findByRole('button', { name: 'Прошедшие' }));

    expect(await screen.findByText('Ретроспектива')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Прошедшие' })).toBeInTheDocument();
  });

  it('отмена проходит через диалог подтверждения и убирает карточку', async () => {
    const user = await renderBookings();
    const cancelled = new Set<string>();
    server.use(
      http.delete(`${API_BASE_URL}/bookings/:bookingId`, ({ params }) => {
        cancelled.add(params.bookingId as string);
        return new HttpResponse(null, { status: 204 });
      }),
      // Список «моих» больше не содержит отменённого бронирования
      http.get(`${API_BASE_URL}/bookings`, () =>
        HttpResponse.json({
          items: myBookings.all.filter((booking) => !cancelled.has(booking.id)),
        }),
      ),
    );

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));

    expect(await screen.findByText('Отменить бронирование?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Это действие нельзя будет отменить. Освободившееся время станет доступно другим сотрудникам.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Комната 'Эверест', 4 этаж")).toBeInTheDocument();
    expect(screen.getByText(/Понедельник, \d+ \p{L}+, 12:00 - 13:00/u)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByText('Бронирование отменено')).toBeInTheDocument();
    expect(cancelled.has('booking-future-current-user')).toBe(true);
    await waitFor(() => expect(screen.queryByText('Планирование спринта')).not.toBeInTheDocument());
  });

  it('«Нет, оставить» закрывает диалог без запроса', async () => {
    const user = await renderBookings();

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Нет, оставить' }));

    expect(screen.queryByText('Отменить бронирование?')).not.toBeInTheDocument();
    expect(await screen.findByText('Планирование спринта')).toBeInTheDocument();
  });

  it('ошибка отмены показывает тост и оставляет диалог открытым', async () => {
    const user = await renderBookings();
    server.use(errorHandlers.cancelError);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByText('Внутренняя ошибка сервера')).toBeInTheDocument();
    expect(screen.getByText('Отменить бронирование?')).toBeInTheDocument();
  });

  it('пустой список показывает empty-state с переходом к переговорным', async () => {
    server.use(http.get(`${API_BASE_URL}/bookings`, () => HttpResponse.json({ items: [] })));
    const user = await renderBookings();

    expect(await screen.findByText('Нет бронирований')).toBeInTheDocument();
    expect(
      screen.getByText(
        'У вас пока нет предстоящих бронирований. Перейдите в раздел переговорных, чтобы забронировать комнату',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Перейти к переговорным' }));
    expect(await screen.findByRole('heading', { name: 'Выберите офис' })).toBeInTheDocument();
  });

  it('ошибка загрузки показывает состояние с retry', async () => {
    server.use(errorHandlers.serverError('/bookings'));
    const user = await renderBookings();

    expect(await screen.findByText('Не удалось загрузить данные')).toBeInTheDocument();
    expect(
      screen.getByText('Произошла ошибка при загрузке ваших бронирований'),
    ).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));

    expect(await screen.findByText('Планирование спринта')).toBeInTheDocument();
  });
});
