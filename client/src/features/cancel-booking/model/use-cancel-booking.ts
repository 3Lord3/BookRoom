import { useState } from 'react';
import { toast } from 'sonner';

import { useCancelBookingMutation, type BookingView } from '@entities/booking';
import { getApiErrorMessage } from '@shared/api/types';

export interface CancelBookingModel {
  // Бронирование в диалоге подтверждения; null, диалог закрыт
  target: BookingView | null;
  isPending: boolean;
  openCancel: (booking: BookingView) => void;
  dismiss: () => void;
  confirm: () => void;
}

// Подтверждение в диалоге, затем DELETE
export function useCancelBooking(): CancelBookingModel {
  const [target, setTarget] = useState<BookingView | null>(null);
  const [cancelBooking, { isLoading }] = useCancelBookingMutation();

  const confirm = async () => {
    if (!target) {
      return;
    }
    try {
      await cancelBooking(target.id).unwrap();
      toast.success('Бронирование отменено');
      setTarget(null);
    } catch (error) {
      // Диалог остаётся открытым, чтобы можно было повторить попытку
      toast.error(getApiErrorMessage(error) ?? 'Не удалось отменить бронирование');
    }
  };

  return {
    target,
    isPending: isLoading,
    openCancel: setTarget,
    dismiss: () => setTarget(null),
    confirm,
  };
}
