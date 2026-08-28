import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useCreateBookingMutation, type CreateBookingRequest } from '@entities/booking';
import { baseApi } from '@shared/api/base-api';
import { API_ERROR_CODES, getApiErrorCode, getApiErrorMessage } from '@shared/api/types';
import type { Interval } from '@shared/lib/dates';
import { buildInterval } from '@shared/lib/dates';

import { createBookingSchema, type BookingForm } from '../lib/booking-schema';
import {
  formatOccurrenceCount,
  formatSeriesToastDescription,
  formatSummary,
  formatToastDescription,
} from '../lib/format-summary';
import { buildOccurrenceSeries } from '../lib/recurrence';

// Открывает модалку пустой формой
const CREATE_KEY = 'create';

// Пустая форма: интервал из расписания больше не подставляется
const EMPTY_DEFAULTS: Pick<BookingForm, 'date' | 'startTime' | 'duration'> = {
  date: '',
  startTime: '',
  duration: 60,
};

export interface CreateBookingOptions {
  // Интервал, подставляемый в форму при открытии (фильтры списка комнат)
  initial?: Pick<BookingForm, 'date' | 'startTime' | 'duration'>;
}

export interface CreateBookingModel {
  open: boolean;
  summary: string | null;
  // Сервер вернул 409, показываем состояние конфликта
  conflict: boolean;
  isSubmitting: boolean;
  // Прогресс серии: отправлено из общего числа; null, если не серия
  progress: { done: number; total: number } | null;
  close: () => void;
  // Возврат на форму после конфликта
  resolveConflict: () => void;
  submit: (values: BookingForm) => void;
  form: ReturnType<typeof useForm<BookingForm>>;
}

export function useCreateBooking(
  roomId: string | null,
  timezone: string,
  roomName: string,
  options: CreateBookingOptions = {},
): CreateBookingModel {
  const [searchParams, setSearchParams] = useSearchParams();

  const createOpen = searchParams.get(CREATE_KEY) === '1';
  const open = createOpen && roomId !== null && timezone !== '';

  const form = useForm<BookingForm>({
    resolver: zodResolver(createBookingSchema({ timezone })),
    defaultValues: {
      title: '',
      comment: '',
      repeat: 'none',
      occurrences: 4,
      ...(options.initial ?? EMPTY_DEFAULTS),
    },
    mode: 'onSubmit',
  });

  // Фильтры могли измениться после монтирования: при каждом открытии берём текущий интервал
  const initialRef = useRef(options.initial);
  useEffect(() => {
    initialRef.current = options.initial;
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        comment: '',
        repeat: 'none',
        occurrences: 4,
        ...(initialRef.current ?? EMPTY_DEFAULTS),
      });
    }
  }, [open, roomId, form]);

  const [createBooking, { isLoading }] = useCreateBookingMutation();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const dispatch = useDispatch();

  // Первый рендер отдаёт defaultValue, поля ещё не зарегистрированы
  const watched = useWatch({
    control: form.control,
    defaultValue: { date: '', startTime: '', duration: 60, repeat: 'none', occurrences: 4 },
  });
  let summary: string | null = null;
  if (open && watched.date && watched.startTime && watched.duration) {
    const base = formatSummary(
      buildInterval(watched.date, watched.startTime, watched.duration, timezone),
      timezone,
    );
    summary =
      watched.repeat && watched.repeat !== 'none' && watched.occurrences
        ? `${base} · ${formatOccurrenceCount(watched.occurrences)}`
        : base;
  }

  const clearOpenParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(CREATE_KEY);
    setSearchParams(next);
  };

  const close = () => {
    clearOpenParams();
    form.reset({ title: '', comment: '', repeat: 'none', occurrences: 4, ...EMPTY_DEFAULTS });
  };

  const submit = async (values: BookingForm) => {
    if (!roomId) {
      return;
    }
    const built = buildInterval(values.date, values.startTime, values.duration, timezone);
    // У одиночной брони отдельное состояние конфликта, у серии сводный итог
    if (values.repeat === 'none') {
      await submitSingle(roomId, built, values);
      return;
    }
    await submitSeries(
      roomId,
      buildOccurrenceSeries(built, values.occurrences, values.repeat, timezone),
      values,
    );
  };

  const bookingBody = (
    room: string,
    interval: Interval,
    values: BookingForm,
  ): CreateBookingRequest => ({
    roomId: room,
    title: values.title,
    startsAt: interval.from,
    endsAt: interval.to,
    ...(values.comment ? { comment: values.comment } : {}),
  });

  const submitSingle = async (room: string, built: Interval, values: BookingForm) => {
    try {
      await createBooking(bookingBody(room, built, values)).unwrap();
      toast.success('Бронирование создано', {
        description: formatToastDescription(roomName, built, timezone),
      });
      close();
    } catch (error) {
      if (getApiErrorCode(error) === API_ERROR_CODES.bookingConflict) {
        form.setError('root', { type: 'conflict' });
        // «Расписание обновлено» из макета: сбрасываем кэш открытого расписания
        if (room) {
          dispatch(baseApi.util.invalidateTags([{ type: 'RoomSchedule', id: room }]));
        }
        return;
      }
      // Показываем сообщение, иначе сбой пройдёт незаметно
      toast.error(getApiErrorMessage(error) ?? 'Не удалось создать бронирование');
    }
  };

  const submitSeries = async (room: string, series: Interval[], values: BookingForm) => {
    const failed: string[] = [];
    let created = 0;
    setProgress({ done: 0, total: series.length });
    for (const interval of series) {
      try {
        await createBooking(bookingBody(room, interval, values)).unwrap();
        created += 1;
      } catch (error) {
        failed.push(getApiErrorMessage(error) ?? 'Не удалось создать бронирование');
      }
      setProgress({ done: created + failed.length, total: series.length });
    }
    setProgress(null);
    if (created === series.length) {
      toast.success('Бронирование создано', {
        description: formatSeriesToastDescription(roomName, series, timezone),
      });
      close();
    } else if (created === 0) {
      // Остаёмся на форме, чтобы исправить параметры и повторить
      toast.error(failed[0] ?? 'Не удалось создать бронирования');
    } else {
      toast.error('Созданы не все бронирования', {
        description: `Создано ${created} из ${series.length}`,
      });
      close();
    }
  };

  const conflict = form.formState.errors.root?.type === 'conflict';

  return {
    open,
    summary,
    conflict,
    isSubmitting: isLoading || progress !== null,
    progress,
    close,
    resolveConflict: () => {
      form.clearErrors('root');
      clearOpenParams();
    },
    submit,
    form,
  };
}
