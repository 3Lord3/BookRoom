import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { WsConnectionStatus } from '@shared/lib/ws';

export interface ConnectionStatusState {
  status: WsConnectionStatus;
}

const initialState: ConnectionStatusState = { status: 'disconnected' };

const connectionStatusSlice = createSlice({
  name: 'connectionStatus',
  initialState,
  reducers: {
    connectionStatusChanged(state, action: PayloadAction<WsConnectionStatus>) {
      state.status = action.payload;
    },
  },
});

export const { connectionStatusChanged } = connectionStatusSlice.actions;
export const connectionStatusReducer = connectionStatusSlice.reducer;

// Минимальная форма слайса вместо RootState: селектор не знает про другие редьюсеры
export const selectConnectionStatus = (state: { connectionStatus: ConnectionStatusState }) =>
  state.connectionStatus.status;
