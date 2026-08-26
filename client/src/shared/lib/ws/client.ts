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

// Состояния соединения: reconnecting — обрыв не по нашей воле, идёт переподключение
export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type WsStatusHandler = (status: WsConnectionStatus) => void;

export interface WsClient {
  connect(): void;
  close(): void;
  // Подписка на события; возвращает функцию отписки
  subscribe(handler: WsEventHandler): () => void;
  // Подписка на смену статуса; сразу сообщает текущий статус
  subscribeStatus(handler: WsStatusHandler): () => void;
}

export interface CreateWsClientOptions {
  url: string;
  // Подменяемый конструктор WebSocket для тестов
  WebSocketImpl?: new (url: string) => WsSocketLike;
  // Шаг экспоненциальной задержки переподключения и её потолок
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

// Тонкий клиент broadcast-канала: соединение, разбор сообщений и рассылка подписчикам.
// Обрыв не по нашей воле приводит к экспоненциальному переподключению (без истории
// сообщений в канале единственная стратегия — повторный запрос REST-данных, см. middleware)
export function createWsClient(options: CreateWsClientOptions): WsClient {
  const Impl = options.WebSocketImpl ?? WebSocket;
  const baseDelay = options.reconnectDelayMs ?? 1000;
  const maxDelay = options.maxReconnectDelayMs ?? 30_000;

  let socket: WsSocketLike | null = null;
  let status: WsConnectionStatus = 'disconnected';
  let manuallyClosed = true;
  let everConnected = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const handlers = new Set<WsEventHandler>();
  const statusHandlers = new Set<WsStatusHandler>();

  const setStatus = (next: WsConnectionStatus) => {
    if (next === status) {
      return;
    }
    status = next;
    for (const handler of statusHandlers) {
      handler(next);
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (manuallyClosed) {
      return;
    }
    clearReconnectTimer();
    const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
    attempt += 1;
    setStatus('reconnecting');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openSocket();
    }, delay);
  };

  const openSocket = () => {
    if (socket || manuallyClosed) {
      return;
    }
    const next = new Impl(options.url);
    // Повторное открытие после обрыва тоже «переподключение»: зависшая в CONNECTING
    // попытка не должна гасить индикатор, пока канал ещё недоступен
    setStatus(everConnected ? 'reconnecting' : 'connecting');
    next.addEventListener('message', (event) => {
      // События старого сокета (между error и close) не доставляются подписчикам
      if (socket !== next) {
        return;
      }
      const parsed = parseWsEvent(String(event.data));
      if (parsed) {
        for (const handler of handlers) {
          handler(parsed);
        }
      }
    });
    next.addEventListener('open', () => {
      everConnected = true;
      attempt = 0;
      setStatus('connected');
    });
    // События старого сокета не трогают соединение, если за это время уже открыто
    // новое: сравнение по ссылке защищает от гонки close/error после reconnect
    next.addEventListener('close', () => {
      if (socket === next) {
        socket = null;
        scheduleReconnect();
      }
    });
    next.addEventListener('error', () => {
      if (socket === next) {
        socket = null;
        scheduleReconnect();
      }
    });
    socket = next;
  };

  const connect = () => {
    manuallyClosed = false;
    clearReconnectTimer();
    openSocket();
  };

  const close = () => {
    manuallyClosed = true;
    everConnected = false;
    clearReconnectTimer();
    const current = socket;
    socket = null;
    if (current) {
      current.close();
    }
    setStatus('disconnected');
  };

  const subscribe = (handler: WsEventHandler) => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  };

  const subscribeStatus = (handler: WsStatusHandler) => {
    statusHandlers.add(handler);
    handler(status);
    return () => {
      statusHandlers.delete(handler);
    };
  };

  return { connect, close, subscribe, subscribeStatus };
}
