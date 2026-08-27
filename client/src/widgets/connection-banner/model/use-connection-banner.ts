import { useSelector } from 'react-redux';

import { selectConnectionStatus } from '@features/real-time-sync';

export interface ConnectionBannerModel {
  // Виден весь обрыв: статус держится в 'reconnecting' во время попыток
  visible: boolean;
}

export function useConnectionBanner(): ConnectionBannerModel {
  const status = useSelector(selectConnectionStatus);
  return { visible: status === 'reconnecting' };
}
