import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { realTimeStarted, realTimeStopped } from '@features/real-time-sync';
import type { WsClient } from '@shared/lib/ws';
import { Toaster } from '@shared/ui/sonner';

import { createStore } from './store';

interface AppProviderProps {
  children: ReactNode;
  // В тестах не передаётся, real-time отключён
  wsClient?: WsClient;
}

export function AppProvider({ children, wsClient }: AppProviderProps) {
  const [store] = useState(() => createStore({ wsClient }));

  // Соединение живёт, пока приложение смонтировано; повторный запуск эффекта закрывает его корректно
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
