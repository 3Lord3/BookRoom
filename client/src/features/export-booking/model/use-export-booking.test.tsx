import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toUtcStamp } from '@entities/booking';

import { useExportBooking } from './use-export-booking';
import { myBookings } from '../../../mocks/fixtures';

describe('useExportBooking', () => {
  const booking = myBookings.all[0]!;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('инициирует скачивание файла с именем из названия встречи', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current(booking));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('Планирование спринта.ics');
    expect(anchor.href).toMatch(/^blob:/);
  });

  it('отдаёт Blob типа text/calendar с содержимым .ics и UTC-датами', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL');
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current(booking));

    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    const content = await blob.text();
    expect(content).toContain(`DTSTART:${toUtcStamp(booking.startsAt)}`);
    expect(content).toContain(`DTEND:${toUtcStamp(booking.endsAt)}`);
    expect(content).toContain(`UID:${booking.id}@bookroom`);
  });

  it('убирает недопустимые в имени файла символы из названия', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current({ ...booking, title: 'Daily Sync / Команда: релиз' }));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('Daily Sync - Команда- релиз.ics');
  });

  it('удаляет управляющие символы и хвостовые точки из имени файла', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current({ ...booking, title: 'Daily Sync\u0000\n.' }));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('Daily Sync.ics');
  });

  it('не использует зарезервированные имена устройств Windows', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current({ ...booking, title: 'CON' }));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('CON_.ics');
  });

  it('подменяет зарезервированную базу имени до первой точки', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current({ ...booking, title: 'NUL.notes' }));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('NUL_.notes.ics');
  });

  it('использует запасное имя, если название состоит из одних управляющих символов', () => {
    const { result } = renderHook(() => useExportBooking());

    act(() => result.current({ ...booking, title: '\u0000\n\t' }));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('встреча.ics');
  });
});
