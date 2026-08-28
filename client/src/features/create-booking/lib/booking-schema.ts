import { TZDate } from '@date-fns/tz';
import { z } from 'zod';

import {
  MAX_AHEAD_DAYS,
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';
import { buildInterval } from '@shared/lib/dates';

import { buildOccurrenceSeries, type Recurrence } from './recurrence';

// Значения полей формы до расчёта UTC-интервала
export interface BookingFormValues {
  title: string;
  date: string;
  startTime: string;
  duration: number;
  comment: string;
  repeat: 'none' | Recurrence;
  occurrences: number;
}

export interface BookingSchemaContext {
  timezone: string;
  now?: Date;
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

// Зеркалит правила бэкенда (server/src/services/booking-rules.ts); таймзона и «сейчас»
// впрыскиваются для детерминированной проверки
export function createBookingSchema(context: BookingSchemaContext) {
  const { timezone } = context;
  const now = context.now ?? new Date();
  const MAX_ADVANCE_MS = MAX_AHEAD_DAYS * 24 * 60 * 60 * 1000;

  return z
    .object({
      title: z.string().trim().min(1, 'Обязательное поле').max(200),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
      startTime: z
        .string()
        .regex(timePattern, 'Время в формате ЧЧ:ММ')
        .refine(
          (value) => Number(value.slice(3)) % TIME_STEP_MINUTES === 0,
          `Время должно быть кратно ${TIME_STEP_MINUTES} минутам`,
        ),
      duration: z.number().int().min(TIME_STEP_MINUTES, 'Минимум 15 минут'),
      comment: z.string().trim().max(2_000).optional(),
      repeat: z.enum(['none', 'daily', 'weekdays', 'weekly']),
      // Верхний предел не задаём: реально серию режет горизонт +30 дней ниже
      occurrences: z.number().int().min(2, 'Минимум 2 встречи'),
    })
    .superRefine((values, ctx) => {
      if (values.duration % TIME_STEP_MINUTES !== 0) {
        return;
      }
      const interval = buildInterval(values.date, values.startTime, values.duration, timezone);
      const startsAt = new Date(interval.from);
      const endsAt = new Date(interval.to);

      if (startsAt.getTime() <= now.getTime()) {
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: 'Нельзя создать бронирование в прошлом',
        });
        return;
      }
      if (startsAt.getTime() - now.getTime() > MAX_ADVANCE_MS) {
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: `Бронирование доступно не более чем на ${MAX_AHEAD_DAYS} дней вперёд`,
        });
        return;
      }

      const start = new TZDate(startsAt.getTime(), timezone);
      const end = new TZDate(endsAt.getTime(), timezone);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      const sameLocalDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

      if (
        !sameLocalDay ||
        startMinutes < WORK_DAY_START_MINUTES ||
        endMinutes > WORK_DAY_END_MINUTES
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'Время должно быть в рабочих часах с 09:00 до 20:00',
        });
      }

      // У «по будням» первое вхождение — сама выбранная дата, поэтому она обязана быть будним днём
      if (values.repeat === 'weekdays' && (start.getDay() === 0 || start.getDay() === 6)) {
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: 'Дата должна быть будним днём',
        });
      }

      // Последнее вхождение серии не должно выходить за горизонт +30 дней
      if (values.repeat !== 'none' && values.occurrences > 1) {
        const last = buildOccurrenceSeries(
          interval,
          values.occurrences,
          values.repeat,
          timezone,
        ).at(-1);
        if (last && new Date(last.from).getTime() - now.getTime() > MAX_ADVANCE_MS) {
          ctx.addIssue({
            code: 'custom',
            path: ['occurrences'],
            message: `Повторы не должны выходить за ${MAX_AHEAD_DAYS} дней вперёд`,
          });
        }
      }
    });
}

export type BookingForm = z.infer<ReturnType<typeof createBookingSchema>>;
