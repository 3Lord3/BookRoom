import { configureStore } from '@reduxjs/toolkit';

import { connectionStatusReducer, createRealTimeSyncMiddleware } from '@features/real-time-sync';
import { baseApi } from '@shared/api/base-api';
import type { WsClient } from '@shared/lib/ws';

export interface CreateStoreOptions {
  // WS-клиент; в тестах фейковый
  wsClient?: WsClient;
}

export const createStore = (options: CreateStoreOptions = {}) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      connectionStatus: connectionStatusReducer,
    },
    middleware: (getDefaultMiddleware) => {
      const chain = getDefaultMiddleware().concat(baseApi.middleware);
      return options.wsClient
        ? chain.concat(createRealTimeSyncMiddleware(options.wsClient))
        : chain;
    },
  });

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
