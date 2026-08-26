import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import { connectionStatusChanged, connectionStatusReducer } from '@features/real-time-sync';
import type { WsConnectionStatus } from '@shared/lib/ws';

import { ConnectionBanner } from './connection-banner';

const BANNER_TEXT = 'Соединение потеряно. Переподключение...';

function renderBanner(status: WsConnectionStatus) {
  const store = configureStore({ reducer: { connectionStatus: connectionStatusReducer } });
  store.dispatch(connectionStatusChanged(status));
  render(
    <Provider store={store}>
      <ConnectionBanner />
    </Provider>,
  );
  return store;
}

describe('ConnectionBanner', () => {
  it('не показывается при установленном соединении', () => {
    renderBanner('connected');

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('показывается во время переподключения', () => {
    renderBanner('reconnecting');

    expect(screen.getByRole('status')).toHaveTextContent(BANNER_TEXT);
  });

  it('скрывается после восстановления соединения', () => {
    const store = renderBanner('reconnecting');

    act(() => {
      store.dispatch(connectionStatusChanged('connected'));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
