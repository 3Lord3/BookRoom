import { describe, expect, it } from 'vitest';

import { mskBelt } from './msk-belt';

describe('mskBelt', () => {
  it('Москва — без смещения', () => {
    expect(mskBelt('Europe/Moscow')).toBe('MSK');
  });

  it('офис восточнее Москвы — плюс к MSK', () => {
    expect(mskBelt('Asia/Yekaterinburg')).toBe('MSK+2');
    expect(mskBelt('Asia/Chita')).toBe('MSK+6');
  });

  it('офис западнее Москвы — минус от MSK', () => {
    expect(mskBelt('Europe/Kaliningrad')).toBe('MSK-1');
  });

  it('нецелое смещение — дробная часть в часах', () => {
    expect(mskBelt('Asia/Kolkata')).toBe('MSK+2.5');
  });
});
