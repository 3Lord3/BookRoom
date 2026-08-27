import { describe, expect, it } from 'vitest';

import { createBookingSchema } from './booking-schema';

// 09:00 по Москве, UTC+3 летом
const NOW = new Date('2026-08-24T06:00:00.000Z');

const schema = () => createBookingSchema({ timezone: 'Europe/Moscow', now: NOW });

const valid = {
  title: 'Daily Sync',
  date: '2026-08-24',
  startTime: '10:00',
  duration: 60,
  comment: '',
  repeat: 'none',
  occurrences: 4,
};

describe('createBookingSchema', () => {
  it('принимает корректное будущее бронирование в рабочих часах', () => {
    const result = schema().safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('требует тему встречи', () => {
    const result = schema().safeParse({ ...valid, title: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Обязательное поле');
    }
  });

  it('отклоняет бронирование в прошлом', () => {
    const result = schema().safeParse({ ...valid, startTime: '09:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'date');
      expect(issue?.message).toBe('Нельзя создать бронирование в прошлом');
    }
  });

  it('отклоняет бронирование дальше +30 дней', () => {
    const result = schema().safeParse({ ...valid, date: '2026-09-24' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'date');
      expect(issue?.message).toBe('Бронирование доступно не более чем на 30 дней вперёд');
    }
  });

  it('отклоняет время не кратное 15 минутам', () => {
    const result = schema().safeParse({ ...valid, startTime: '10:07' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'startTime');
      expect(issue?.message).toContain('кратно 15');
    }
  });

  it('отклоняет выход за рабочие часы 09:00–20:00', () => {
    const late = schema().safeParse({ ...valid, startTime: '19:30', duration: 60 });
    expect(late.success).toBe(false);
    if (!late.success) {
      const issue = late.error.issues.find((item) => item.path[0] === 'startTime');
      expect(issue?.message).toBe('Время должно быть в рабочих часах с 09:00 до 20:00');
    }
  });

  it('отклоняет длительность меньше 15 минут', () => {
    const result = schema().safeParse({ ...valid, duration: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Минимум 15 минут');
    }
  });

  it('принимает еженедельный повтор с корректным числом вхождений', () => {
    const result = schema().safeParse({ ...valid, repeat: 'weekly', occurrences: 4 });
    expect(result.success).toBe(true);
  });

  it('отклоняет количество вхождений меньше 2', () => {
    const result = schema().safeParse({ ...valid, repeat: 'weekly', occurrences: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'occurrences');
      expect(issue?.message).toBe('Минимум 2 встречи');
    }
  });

  it('отклоняет количество вхождений больше 8', () => {
    const result = schema().safeParse({ ...valid, repeat: 'weekly', occurrences: 9 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'occurrences');
      expect(issue?.message).toBe('Максимум 8 встреч');
    }
  });

  it('отклоняет серию, последнее вхождение которой выходит за +30 дней', () => {
    // 24.08 + 5 недель = 28.09, дальше горизонта (23.09)
    const result = schema().safeParse({ ...valid, repeat: 'weekly', occurrences: 6 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'occurrences');
      expect(issue?.message).toBe('Повторы не должны выходить за 30 дней вперёд');
    }
  });

  it('принимает серию, укладывающуюся в +30 дней', () => {
    const result = schema().safeParse({ ...valid, repeat: 'weekly', occurrences: 5 });
    expect(result.success).toBe(true);
  });
});
