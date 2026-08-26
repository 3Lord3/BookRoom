import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useRoomFilters } from './use-room-filters';

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('useRoomFilters', () => {
  it('без офиса не строит интервал', () => {
    const { result } = renderHook(() => useRoomFilters(null), {
      wrapper: makeWrapper('/rooms'),
    });

    expect(result.current.date).toBeNull();
    expect(result.current.time).toBeNull();
    expect(result.current.request).toEqual({});
  });

  it('подставляет дефолты таймзоны офиса и строит интервал', () => {
    const { result } = renderHook(() => useRoomFilters('Europe/Moscow'), {
      wrapper: makeWrapper('/rooms'),
    });

    expect(result.current.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.time).toMatch(/^\d{2}:\d{2}$/);
    expect(result.current.duration).toBe(60);
    expect(result.current.request.from).toBeDefined();
    expect(result.current.request.to).toBeDefined();
    expect(result.current.request.minCapacity).toBeUndefined();
  });

  it('читает фильтры из searchParams и считает интервал в таймзоне офиса', () => {
    const { result } = renderHook(() => useRoomFilters('Europe/Moscow'), {
      wrapper: makeWrapper('/rooms?date=2026-09-01&time=10:15&duration=30&capacity=4'),
    });

    expect(result.current.date).toBe('2026-09-01');
    expect(result.current.time).toBe('10:15');
    expect(result.current.duration).toBe(30);
    expect(result.current.capacity).toBe(4);
    // Летом Москва = UTC+3
    expect(result.current.request.minCapacity).toBe(4);
    expect(result.current.request.from).toBe('2026-09-01T07:15:00.000Z');
    expect(result.current.request.to).toBe('2026-09-01T07:45:00.000Z');
  });

  it('битая дата из URL игнорируется и заменяется сегодняшним днём', () => {
    const { result } = renderHook(() => useRoomFilters('Europe/Moscow'), {
      wrapper: makeWrapper('/rooms?date=abc'),
    });

    expect(result.current.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.request.from).toBeDefined();
  });
});
