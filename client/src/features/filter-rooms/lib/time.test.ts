import { describe, expect, it } from 'vitest';

import { applyTimeMask, isAlignedToStep, isValidTime } from './time';

describe('applyTimeMask', () => {
  it('вставляет двоеточие после часов', () => {
    expect(applyTimeMask('1415')).toBe('14:15');
  });

  it('отбрасывает нецифровые символы и лишние разряды', () => {
    expect(applyTimeMask('14:5a988')).toBe('14:59');
  });

  it('пропускает короткий ввод без изменений', () => {
    expect(applyTimeMask('1')).toBe('1');
    expect(applyTimeMask('14')).toBe('14');
  });
});

describe('isValidTime', () => {
  it('принимает корректное время', () => {
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });

  it('отклоняет некорректное время', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:30')).toBe(false);
    expect(isValidTime('10:60')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });
});

describe('isAlignedToStep', () => {
  it('истина только для времени, кратного 15 минутам', () => {
    expect(isAlignedToStep('15:00')).toBe(true);
    expect(isAlignedToStep('09:45')).toBe(true);
    expect(isAlignedToStep('15:05')).toBe(false);
  });
});
