import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';

import '@app/styles/globals.css';

import { AppProvider } from './providers/app-provider';
import { createAppRouter } from './router/router';

export function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
