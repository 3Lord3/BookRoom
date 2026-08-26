import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { realTimeStarted, realTimeStopped } from '@features/real-time-sync';
import type { WsClient } from '@shared/lib/ws';
import { Toaster } from '@shared/ui/sonner';

import { createStore } from './store';

interface AppProviderProps {
  children: ReactNode;
  /** Включает real-time-синхронизацию; в тестах не передаётся */
  wsClient?: WsClient;
}

export function AppProvider({ children, wsClient }: AppProviderProps) {
  // Инициализация один раз на монтирование: store не пересоздаётся при ре-рендерах
  const [store] = useState(() => createStore({ wsClient }));

  // Соединение живёт, пока смонтировано приложение; StrictMode-размонтирование
  // корректно закрывает его повторным запуском
  useEffect(() => {
    if (!wsClient) {
      return;
    }
    store.dispatch(realTimeStarted());
    return () => {
      store.dispatch(realTimeStopped());
    };
  }, [store, wsClient]);

  return (
    <Provider store={store}>
      {children}
      <Toaster />
    </Provider>
  );
}
