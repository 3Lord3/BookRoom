import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../../app/app';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';
import { API_BASE_URL } from '../../../shared/config/env';

// Интеграция с поповерами календаря и селектов медленная в общем прогоне
vi.setConfig({ testTimeout: 20_000 });

// Тосты живут в глобальном store sonner и переживают размонтирование App между тестами
beforeEach(() => {
  toast.dismiss();
});

// Дата ближайшего понедельника, синхронно с фикстурами
function nextMondayIso(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

async function renderDialog() {
  const monday = nextMondayIso();
  window.history.replaceState({}, '', `/rooms/room-everest?date=${monday}&create=1`);
  render(<App />);
  const user = userEvent.setup();
  const title = await screen.findByRole('heading', { name: 'Новое бронирование' });
  return { user, title, monday };
}

// День в календаре доступен по aria-label в формате PPPP из ru-локали
async function pickDate(user: ReturnType<typeof userEvent.setup>, date: string) {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const label = format(new Date(year, month - 1, day), 'PPPP', { locale: ru });

  await user.click(screen.getByRole('button', { name: 'Дата' }));
  for (let i = 0; i < 2 && !screen.queryByRole('button', { name: label }); i += 1) {
    await user.click(screen.getByRole('button', { name: 'Go to the Next Month' }));
  }
  await user.click(screen.getByRole('button', { name: label }));
}

// Заполняет форму до валидного состояния: дата, время начала, длительность
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  monday: string,
  options: { startTime?: string; duration?: string } = {},
) {
  await pickDate(user, monday);
  await user.click(screen.getByRole('combobox', { name: 'Время начала' }));
  await user.click(within(screen.getByRole('listbox')).getByText(options.startTime ?? '14:00'));
  if (options.duration) {
    await user.click(screen.getByRole('combobox', { name: 'Продолжительность' }));
    await user.click(within(screen.getByRole('listbox')).getByText(options.duration));
  }
}

describe('CreateBookingDialog', () => {
  it('открывается пустой формой и после заполнения показывает сводку в таймзоне офиса', async () => {
    const { user, title, monday } = await renderDialog();

    expect(title).toBeInTheDocument();
    expect(screen.getByText('Переговорная: Эверест (Офис Москва, 4 этаж)')).toBeInTheDocument();
    expect(screen.getByText('Тема встречи *')).toBeInTheDocument();
    // Пока поля пустые, сводки нет
    expect(screen.queryByText(/Бронирование на /)).not.toBeInTheDocument();

    await fillForm(user, monday);

    // 14:00 по Москве
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
    await fillForm(user, monday);
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Бронирование создано')).toBeInTheDocument();
    expect(sentBody).toHaveLength(1);
    expect(sentBody[0]).toMatchObject({
      roomId: 'room-everest',
      title: 'Обсуждение плана',
      startsAt: `${monday}T11:00:00.000Z`,
      endsAt: `${monday}T12:00:00.000Z`,
    });

    // Модалка закрылась, create ушёл из URL
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument(),
    );
    expect(new URLSearchParams(window.location.search).get('create')).toBeNull();
  });

  it('при 409 показывает отдельное состояние конфликта', async () => {
    const { user, monday } = await renderDialog();
    server.use(errorHandlers.conflict);

    await user.type(screen.getByLabelText('Тема встречи *'), 'Конфликтная бронь');
    await fillForm(user, monday);
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
    const { user, monday } = await renderDialog();
    server.use(errorHandlers.submitError);

    await user.type(screen.getByLabelText('Тема встречи *'), 'Сбой брони');
    await fillForm(user, monday);
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Внутренняя ошибка сервера')).toBeInTheDocument();
    // Модалка остаётся открытой, можно повторить
    expect(screen.getByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
  });

  it('пустая тема показывает ошибку и не отправляет запрос', async () => {
    const { user, monday } = await renderDialog();

    await fillForm(user, monday);
    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Обязательное поле')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Новое бронирование' })).toBeInTheDocument();
  });

  it('кнопка «Отмена» закрывает модалку и убирает create из URL', async () => {
    const { user } = await renderDialog();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('create')).toBeNull();
  });

  it('сводка пересчитывается при смене длительности', async () => {
    const { user, monday } = await renderDialog();

    await fillForm(user, monday);
    const summary = await screen.findByText(/Бронирование на /);
    expect(summary).toHaveTextContent('(1 час)');

    await user.click(screen.getByRole('combobox', { name: 'Продолжительность' }));
    await user.click(within(screen.getByRole('listbox')).getByText('30 мин (до 14:30)'));

    expect(await screen.findByText(/Бронирование на /)).toHaveTextContent('(30 мин)');
  });

  it('еженедельный повтор отправляет серию POST и закрывает модалку', async () => {
    const { user, monday } = await renderDialog();

    const sent: string[] = [];
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async ({ request }) => {
        const body = (await request.json()) as { startsAt: string };
        sent.push(body.startsAt);
        return HttpResponse.json(
          { id: `booking-${sent.length}`, roomId: 'room-everest' },
          {
            status: 201,
          },
        );
      }),
    );

    await user.type(screen.getByLabelText('Тема встречи *'), 'Еженедельный синк');
    await fillForm(user, monday);
    await user.click(screen.getByRole('combobox', { name: 'Повторение' }));
    await user.click(within(screen.getByRole('listbox')).getByText('Каждую неделю'));

    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    // Заголовок тоста совпадает с одиночным созданием, проверяем уникальное описание серии
    expect(await screen.findByText(/^4 встречи · Комната Эверест/)).toBeInTheDocument();
    await waitFor(() => expect(sent).toHaveLength(4));

    // Следующее вхождение серии на неделю позже
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    expect(new Date(sent[1]!).getTime() - new Date(sent[0]!).getTime()).toBe(weekMs);

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument(),
    );
  });

  it('повтор «по будням» отправляет серию будних дней', async () => {
    const { user, monday } = await renderDialog();

    const sent: string[] = [];
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async ({ request }) => {
        const body = (await request.json()) as { startsAt: string };
        sent.push(body.startsAt);
        return HttpResponse.json(
          { id: `booking-${sent.length}`, roomId: 'room-everest' },
          {
            status: 201,
          },
        );
      }),
    );

    await user.type(screen.getByLabelText('Тема встречи *'), 'Ежедневный синк');
    await fillForm(user, monday);
    await user.click(screen.getByRole('combobox', { name: 'Повторение' }));
    await user.click(within(screen.getByRole('listbox')).getByText('По будням'));

    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText(/^4 встречи · Комната Эверест/)).toBeInTheDocument();
    await waitFor(() => expect(sent).toHaveLength(4));

    // 4 будних дня подряд с понедельника, 14:00 по Москве
    const expected = [0, 1, 2, 3].map(
      (days) => `${format(addDays(parseISO(monday), days), 'yyyy-MM-dd')}T11:00:00.000Z`,
    );
    expect(sent).toEqual(expected);

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Новое бронирование' })).not.toBeInTheDocument(),
    );
  });

  it('при частичном сбое серии показывает сводный тост', async () => {
    const { user, monday } = await renderDialog();

    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/bookings`, async () => {
        calls += 1;
        if (calls === 2 || calls === 3) {
          return HttpResponse.json(
            {
              error: {
                code: 'BOOKING_CONFLICT',
                message: 'Переговорная уже забронирована на выбранное время',
              },
            },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          { id: `booking-${calls}`, roomId: 'room-everest' },
          { status: 201 },
        );
      }),
    );

    await user.type(screen.getByLabelText('Тема встречи *'), 'Еженедельный синк');
    await fillForm(user, monday);
    await user.click(screen.getByRole('combobox', { name: 'Повторение' }));
    await user.click(within(screen.getByRole('listbox')).getByText('Каждую неделю'));

    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Созданы не все бронирования')).toBeInTheDocument();
    expect(screen.getByText('Создано 2 из 4')).toBeInTheDocument();
    expect(calls).toBe(4);
  });
});
