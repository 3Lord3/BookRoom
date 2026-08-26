import { parseWsEvent } from './parse';
import type { WsEvent } from './types';

// Типы событий сокета: message — данные для разбора, остальные — факт перехода состояния
export interface WsSocketEventMap {
  message: { data: unknown };
  open: void;
  close: void;
  error: void;
}

// Минимальная поверхность WebSocket-соединения, которой пользуется клиент (подмена для тестов)
export interface WsSocketLike {
  addEventListener<K extends keyof WsSocketEventMap>(
    type: K,
    listener: (event: WsSocketEventMap[K]) => void,
  ): void;
  close(): void;
}

export type WsEventHandler = (event: WsEvent) => void;

export interface WsClient {
  connect(): void;
  close(): void;
  // Подписка на события; возвращает функцию отписки
  subscribe(handler: WsEventHandler): () => void;
}

export interface CreateWsClientOptions {
  url: string;
  // Подменяемый конструктор WebSocket для тестов
  WebSocketImpl?: new (url: string) => WsSocketLike;
}

// Тонкий клиент broadcast-канала: соединение, разбор сообщений и рассылка подписчикам
export function createWsClient(options: CreateWsClientOptions): WsClient {
  let socket: WsSocketLike | null = null;
  const handlers = new Set<WsEventHandler>();

  const connect = () => {
    if (socket) {
      return;
    }
    const Impl = options.WebSocketImpl ?? WebSocket;
    const next = new Impl(options.url);
    next.addEventListener('message', (event) => {
      const parsed = parseWsEvent(String(event.data));
      if (parsed) {
        for (const handler of handlers) {
          handler(parsed);
        }
      }
    });
    socket = next;
  };

  const close = () => {
    socket?.close();
    socket = null;
  };

  const subscribe = (handler: WsEventHandler) => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  };

  return { connect, close, subscribe };
}
