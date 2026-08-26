import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWsClient,
  type WsConnectionStatus,
  type WsSocketEventMap,
  type WsSocketLike,
} from './client';
import type { WsEvent } from './types';

class FakeSocket implements WsSocketLike {
  static instances: FakeSocket[] = [];
  closed = false;
  readonly url: string;
  private readonly listeners = new Map<keyof WsSocketEventMap, Array<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  addEventListener<K extends keyof WsSocketEventMap>(
    type: K,
    listener: (event: WsSocketEventMap[K]) => void,
  ): void {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(listener as (event: unknown) => void);
    this.listeners.set(type, bucket);
  }

  close(): void {
    this.closed = true;
  }

  private emit(type: keyof WsSocketEventMap, event: unknown): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  emitMessage(data: unknown): void {
    this.emit('message', { data });
  }

  emitOpen(): void {
    this.emit('open', undefined);
  }

  emitClose(): void {
    this.emit('close', undefined);
  }

  emitError(): void {
    this.emit('error', undefined);
  }
}

const validEvent = JSON.stringify({
  type: 'data.reset',
  occurredAt: '2026-08-19T10:00:00.000Z',
  data: {},
});

describe('createWsClient', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connect открывает соединение на переданном URL', () => {
    const client = createWsClient({
      url: 'ws://example.test/api/v1/ws',
      WebSocketImpl: FakeSocket,
    });
    client.connect();

    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0]!.url).toBe('ws://example.test/api/v1/ws');
  });

  it('повторный connect не открывает второе соединение', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    client.connect();
    client.connect();

    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('валидное сообщение доставляется подписчикам разобранным событием', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    const handler = vi.fn();
    client.subscribe(handler);
    client.connect();

    FakeSocket.instances[0]!.emitMessage(validEvent);

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as WsEvent;
    expect(event.type).toBe('data.reset');
  });

  it('неизвестное сообщение не доставляется', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    const handler = vi.fn();
    client.subscribe(handler);
    client.connect();

    FakeSocket.instances[0]!.emitMessage('garbage');

    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribe отменяет доставку', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    const handler = vi.fn();
    const unsubscribe = client.subscribe(handler);
    client.connect();

    unsubscribe();
    FakeSocket.instances[0]!.emitMessage(validEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('close закрывает сокет', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    client.connect();

    client.close();

    expect(FakeSocket.instances[0]!.closed).toBe(true);
  });

  it('subscribeStatus сразу сообщает текущий статус и смены при подключении', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    const statuses: WsConnectionStatus[] = [];
    client.subscribeStatus((status) => statuses.push(status));
    client.connect();

    FakeSocket.instances[0]!.emitOpen();

    expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
  });

  it('обрыв соединения переводит в reconnecting и переподключается с задержкой', () => {
    vi.useFakeTimers();
    const client = createWsClient({
      url: 'ws://example.test',
      WebSocketImpl: FakeSocket,
      reconnectDelayMs: 100,
    });
    const statuses: WsConnectionStatus[] = [];
    client.subscribeStatus((status) => statuses.push(status));
    client.connect();
    FakeSocket.instances[0]!.emitOpen();
    FakeSocket.instances[0]!.emitClose();

    expect(FakeSocket.instances).toHaveLength(1);
    expect(statuses).toContain('reconnecting');

    vi.advanceTimersByTime(100);

    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('попытка переподключения не гасит состояние reconnecting', () => {
    vi.useFakeTimers();
    const client = createWsClient({
      url: 'ws://example.test',
      WebSocketImpl: FakeSocket,
      reconnectDelayMs: 100,
    });
    const statuses: WsConnectionStatus[] = [];
    client.subscribeStatus((status) => statuses.push(status));
    client.connect();
    FakeSocket.instances[0]!.emitOpen();
    FakeSocket.instances[0]!.emitClose();

    vi.advanceTimersByTime(100);

    expect(FakeSocket.instances).toHaveLength(2);
    expect(statuses[statuses.length - 1]).toBe('reconnecting');
  });

  it('после ручного закрытия следующее соединение считается первичным', () => {
    const client = createWsClient({ url: 'ws://example.test', WebSocketImpl: FakeSocket });
    const statuses: WsConnectionStatus[] = [];
    client.subscribeStatus((status) => statuses.push(status));
    client.connect();
    FakeSocket.instances[0]!.emitOpen();
    client.close();

    client.connect();

    expect(FakeSocket.instances).toHaveLength(2);
    expect(statuses.slice(-2)).toEqual(['disconnected', 'connecting']);
  });

  it('error и следующий за ним close не планируют переподключение дважды', () => {
    vi.useFakeTimers();
    const client = createWsClient({
      url: 'ws://example.test',
      WebSocketImpl: FakeSocket,
      reconnectDelayMs: 100,
    });
    client.connect();
    FakeSocket.instances[0]!.emitError();
    FakeSocket.instances[0]!.emitClose();

    vi.advanceTimersByTime(100);

    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('ручное закрытие останавливает переподключение', () => {
    vi.useFakeTimers();
    const client = createWsClient({
      url: 'ws://example.test',
      WebSocketImpl: FakeSocket,
      reconnectDelayMs: 100,
    });
    const statuses: WsConnectionStatus[] = [];
    client.subscribeStatus((status) => statuses.push(status));
    client.connect();
    FakeSocket.instances[0]!.emitOpen();

    client.close();

    expect(FakeSocket.instances[0]!.closed).toBe(true);
    expect(statuses).toContain('disconnected');

    vi.advanceTimersByTime(500);

    expect(FakeSocket.instances).toHaveLength(1);
  });
});
