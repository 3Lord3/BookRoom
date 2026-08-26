import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWsClient, type WsSocketEventMap, type WsSocketLike } from './client';
import type { WsEvent } from './types';

class FakeSocket implements WsSocketLike {
  static instances: FakeSocket[] = [];
  closed = false;
  readonly url: string;
  private readonly listeners = new Map<string, Array<(event: { data: unknown }) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  addEventListener<K extends keyof WsSocketEventMap>(
    type: K,
    listener: (event: WsSocketEventMap[K]) => void,
  ): void {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(listener as (event: { data: unknown }) => void);
    this.listeners.set(type, bucket);
  }

  close(): void {
    this.closed = true;
  }

  emitMessage(data: unknown): void {
    this.listeners.get('message')?.forEach((listener) => listener({ data }));
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
});
