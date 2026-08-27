import {
  createAction,
  createListenerMiddleware,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { baseApi } from '@shared/api/base-api';
import type { WsClient, WsEvent } from '@shared/lib/ws';

import { connectionStatusChanged } from './connection-status-slice';

export const realTimeStarted = createAction('realTime/started');
export const realTimeStopped = createAction('realTime/stopped');

type SyncDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

function invalidateAll(dispatch: SyncDispatch) {
  dispatch(
    baseApi.util.invalidateTags([
      { type: 'Office' },
      { type: 'Room' },
      { type: 'RoomSchedule' },
      { type: 'MyBookings' },
      { type: 'Viewer' },
    ]),
  );
}

// WS не хранит данные: события лишь инвалидируют теги, активные запросы перезапрашиваются сами
export function createRealTimeSyncMiddleware(wsClient: WsClient) {
  const listener = createListenerMiddleware();
  let unsubscribe: (() => void) | null = null;

  listener.startListening({
    actionCreator: realTimeStarted,
    effect: (_action, listenerApi) => {
      if (unsubscribe) {
        return;
      }
      // Канал после обрыва ничего не помнит, перезапрашиваем весь активный кэш
      let wasConnected = false;
      const detachStatus = wsClient.subscribeStatus((status) => {
        listenerApi.dispatch(connectionStatusChanged(status));
        if (status === 'connected' && wasConnected) {
          invalidateAll(listenerApi.dispatch);
        }
        wasConnected = wasConnected || status === 'connected';
      });
      const detachEvents = wsClient.subscribe((event) => {
        handleWsEvent(event, listenerApi.dispatch);
      });
      unsubscribe = () => {
        detachStatus();
        detachEvents();
      };
      wsClient.connect();
    },
  });

  listener.startListening({
    actionCreator: realTimeStopped,
    effect: () => {
      // Закрываем до отписки, чтобы финальный disconnected попал в стор
      wsClient.close();
      unsubscribe?.();
      unsubscribe = null;
    },
  });

  return listener.middleware;
}

function handleWsEvent(event: WsEvent, dispatch: SyncDispatch) {
  switch (event.type) {
    case 'booking.created':
    case 'booking.cancelled':
      // Меняется и доступность комнат, перезапрашиваем список целиком
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'MyBookings' },
          { type: 'RoomSchedule', id: event.data.booking.roomId },
          { type: 'Room' },
        ]),
      );
      break;
    case 'room.availability_changed':
      // Доступность живёт в отфильтрованном списке комнат
      dispatch(baseApi.util.invalidateTags([{ type: 'Room' }]));
      break;
    case 'data.reset':
      invalidateAll(dispatch);
      break;
  }
}
