import { TZDate } from '@date-fns/tz';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useCreateBookingMutation, type CreateBookingRequest } from '@entities/booking';
import { baseApi } from '@shared/api/base-api';
import { API_ERROR_CODES, getApiErrorCode, getApiErrorMessage } from '@shared/api/types';
import { buildInterval } from '@shared/lib/dates';

import { createBookingSchema, type BookingForm } from '../lib/booking-schema';
import { formatSummary, formatToastDescription } from '../lib/format-summary';

const FROM_KEY = 'from';
const TO_KEY = 'to';
/** Открывает модалку и без интервала из расписания — пустой формой */
const CREATE_KEY = 'create';

/** Достаёт ISO-мгновение из searchParams или null, если параметра нет. */
function paramIso(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

/** UTC-интервал из URL → значения полей формы (в таймзоне офиса). */
function valuesFromInterval(
  from: string,
  to: string,
  timezone: string,
): Pick<BookingForm, 'date' | 'startTime' | 'duration'> {
  const start = new TZDate(new Date(from).getTime(), timezone);
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const duration = (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
  return { date, startTime, duration };
}

export interface CreateBookingModel {
  open: boolean;
  /** Интервал из URL для предзаполнения формы; null — открыта пустая форма */
  interval: { from: string; to: string } | null;
  /** Сводка под формой из текущих значений */
  summary: string | null;
  /** true — сервер вернул 409, показать отдельное состояние конфликта */
  conflict: boolean;
  isSubmitting: boolean;
  close: () => void;
  /** Возвращает на форму после конфликта (закрывает конфликтное состояние) */
  resolveConflict: () => void;
  submit: (values: BookingForm) => void;
  form: ReturnType<typeof useForm<BookingForm>>;
}

/**
 * Создание бронирования. Интервал приходит из URL (?from=&to=), куда его
 * кладёт расписание комнаты; наличие параметров открывает модалку.
 */
export function useCreateBooking(
  roomId: string | null,
  timezone: string,
  roomName: string,
): CreateBookingModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const from = paramIso(searchParams, FROM_KEY);
  const to = paramIso(searchParams, TO_KEY);
  const createOpen = searchParams.get(CREATE_KEY) === '1';
  const open = ((from !== null && to !== null) || createOpen) && roomId !== null && timezone !== '';
  const interval = open && from && to ? { from, to } : null;

  const defaults = interval
    ? valuesFromInterval(interval.from, interval.to, timezone)
    : { date: '', startTime: '', duration: 60 };

  const form = useForm<BookingForm>({
    resolver: zodResolver(createBookingSchema({ timezone })),
    defaultValues: { title: '', comment: '', ...defaults },
    mode: 'onSubmit',
  });

  // При открытии на новом интервале (или после закрытия) форма стартует с его значений
  const intervalKey = interval ? `${interval.from}|${interval.to}` : '';
  useEffect(() => {
    if (interval) {
      form.reset({
        title: '',
        comment: '',
        ...valuesFromInterval(interval.from, interval.to, timezone),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalKey]);

  const [createBooking, { isLoading }] = useCreateBookingMutation();
  const dispatch = useDispatch();

  // Первый рендер отдаёт defaultValue, пока поля формы не зарегистрированы
  const watched = useWatch({
    control: form.control,
    defaultValue: { date: '', startTime: '', duration: 60 },
  });
  const summary =
    open && watched.date && watched.startTime && watched.duration
      ? formatSummary(
          buildInterval(watched.date, watched.startTime, watched.duration, timezone),
          timezone,
        )
      : null;

  const clearOpenParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(FROM_KEY);
    next.delete(TO_KEY);
    next.delete(CREATE_KEY);
    setSearchParams(next);
  };

  const close = () => {
    clearOpenParams();
    form.reset({ title: '', comment: '', ...defaults });
  };

  const submit = async (values: BookingForm) => {
    if (!roomId) {
      return;
    }
    const built = buildInterval(values.date, values.startTime, values.duration, timezone);
    const body: CreateBookingRequest = {
      roomId,
      title: values.title,
      startsAt: built.from,
      endsAt: built.to,
      ...(values.comment ? { comment: values.comment } : {}),
    };

    try {
      await createBooking(body).unwrap();
      toast.success('Бронирование создано', {
        description: formatToastDescription(roomName, built, timezone),
      });
      close();
    } catch (error) {
      if (getApiErrorCode(error) === API_ERROR_CODES.bookingConflict) {
        form.setError('root', { type: 'conflict' });
        // Слот уже занят — «Расписание обновлено» из макета: сбрасываем кэш открытого расписания
        if (roomId) {
          dispatch(baseApi.util.invalidateTags([{ type: 'RoomSchedule', id: roomId }]));
        }
        return;
      }
      // Сбой сети, 5xx или отклонение валидацией сервера — показываем сообщение,
      // иначе запрос провалится молча и пользователь этого не увидит
      toast.error(getApiErrorMessage(error) ?? 'Не удалось создать бронирование');
    }
  };

  const conflict = form.formState.errors.root?.type === 'conflict';

  return {
    open,
    interval,
    summary,
    conflict,
    isSubmitting: isLoading,
    close,
    resolveConflict: () => {
      form.clearErrors('root');
      clearOpenParams();
    },
    submit,
    form,
  };
}
