import { describe, expect, it } from 'vitest';

import { parseDateParam } from './parse-date-param';

describe('parseDateParam', () => {
  it('валидную дату возвращает без изменений', () => {
    expect(parseDateParam('2026-08-26', '2000-01-01')).toBe('2026-08-26');
  });

  it('отсутствующее значение заменяется значением по умолчанию', () => {
    expect(parseDateParam(null, '2000-01-01')).toBe('2000-01-01');
  });

  it.each(['abc', '26-08-26', '2026-8-9', '2026/08/26', ''])(
    'строку не в формате «YYYY-MM-DD» (%s) заменяет на значение по умолчанию',
    (value) => {
      expect(parseDateParam(value, '2000-01-01')).toBe('2000-01-01');
    },
  );

  it('несуществующий календарный день заменяется значением по умолчанию', () => {
    expect(parseDateParam('2026-02-30', '2000-01-01')).toBe('2000-01-01');
  });

  it('null в качестве значения по умолчанию проходит насквозь', () => {
    expect(parseDateParam(null, null)).toBeNull();
  });
});
