import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@app';
import { WS_URL } from '@shared/config/env';
import { createWsClient } from '@shared/lib/ws';

// Клиент создаётся один раз на загрузку; соединение открывает AppProvider (effect)
const wsClient = createWsClient({ url: WS_URL });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App wsClient={wsClient} />
  </StrictMode>,
);
