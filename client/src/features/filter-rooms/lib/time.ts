import { TIME_STEP_MINUTES } from '@shared/config/schedule';

/** Маска ввода времени: только цифры, автоподстановка «:» после часов */
export function applyTimeMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Время кратно шагу сетки (15 минут) */
export function isAlignedToStep(value: string): boolean {
  const minutes = Number(value.slice(3));
  return minutes % TIME_STEP_MINUTES === 0;
}
