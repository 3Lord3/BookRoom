import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';

import '@app/styles/globals.css';

import type { WsClient } from '@shared/lib/ws';

import { AppProvider } from './providers/app-provider';
import { createAppRouter } from './router/router';

interface AppProps {
  wsClient?: WsClient;
}

export function App({ wsClient }: AppProps) {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <AppProvider wsClient={wsClient}>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
