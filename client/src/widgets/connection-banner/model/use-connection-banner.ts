import { useSelector } from 'react-redux';

import { selectConnectionStatus } from '@features/real-time-sync';

export interface ConnectionBannerModel {
  /** Баннер виден весь обрыв: клиент держит status = 'reconnecting' и во время попыток */
  visible: boolean;
}

export function useConnectionBanner(): ConnectionBannerModel {
  const status = useSelector(selectConnectionStatus);
  return { visible: status === 'reconnecting' };
}
