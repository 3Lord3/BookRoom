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

// Real-time-синхронизация. WS не хранит данные (единственный источник — RTK Query):
// каждое событие лишь инвалидирует теги, и активные запросы перезапрашиваются сами
export function createRealTimeSyncMiddleware(wsClient: WsClient) {
  const listener = createListenerMiddleware();
  let unsubscribe: (() => void) | null = null;

  listener.startListening({
    actionCreator: realTimeStarted,
    effect: (_action, listenerApi) => {
      if (unsubscribe) {
        return;
      }
      // После reconnect (не первый connect) broadcast-канал ничего не помнит —
      // перезапрашиваем весь активный кэш, иначе события, пропущенные за обрыв, потеряются
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
      // Сначала закрываем, пока статус-подписка жива: финальный disconnected должен
      // попасть в стор, иначе после остановки в нём застрянет reconnecting
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
      // Создание/отмена меняют расписание комнаты и «мои бронирования»
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'MyBookings' },
          { type: 'RoomSchedule', id: event.data.booking.roomId },
        ]),
      );
      break;
    case 'room.availability_changed':
      // Доступность комнат на выбранном интервале — признак из отфильтрованного списка
      dispatch(baseApi.util.invalidateTags([{ type: 'Room' }]));
      break;
    case 'data.reset':
      invalidateAll(dispatch);
      break;
  }
}
