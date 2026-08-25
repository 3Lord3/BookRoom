import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { Toaster } from '@shared/ui/sonner';

import { createStore } from './store';

export function AppProvider({ children }: { children: ReactNode }) {
  // Инициализация один раз на монтирование: store не пересоздаётся при ре-рендерах
  const [store] = useState(createStore);

  return (
    <Provider store={store}>
      {children}
      <Toaster />
    </Provider>
  );
}
