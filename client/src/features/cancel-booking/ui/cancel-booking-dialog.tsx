import { CalendarIcon, DoorOpen } from 'lucide-react';

import { formatBookingFull, formatBookingRoom } from '@entities/booking';
import { Button } from '@shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';

import type { CancelBookingModel } from '../model/use-cancel-booking';

/** Подтверждение отмены из макета: заголовок, сводка места и времени, две кнопки. */
export function CancelBookingDialog({ model }: { model: CancelBookingModel }) {
  const { target } = model;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && model.dismiss()}>
      <DialogContent
        showCloseButton={false}
        className="w-[480px] max-w-[calc(100vw-32px)] gap-0 rounded-20 bg-card p-32 shadow-1 sm:max-w-[480px]"
      >
        {target && (
          <>
            <DialogHeader className="gap-4 text-left">
              <DialogTitle className="text-5xl font-extrabold text-foreground">
                Отменить бронирование?
              </DialogTitle>
              <DialogDescription className="text-xl text-blue-700">
                Это действие нельзя будет отменить. Освободившееся время станет доступно другим
                сотрудникам.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-24 flex flex-col gap-12 rounded-12 bg-blue-50 p-16">
              <h3 className="text-2xl font-bold">{target.title}</h3>
              <div className="flex flex-col gap-6 text-lg text-blue-700">
                <div className="flex items-center gap-8">
                  <DoorOpen className="size-14 shrink-0" strokeWidth={2} />
                  {formatBookingRoom(target.room)}
                </div>
                <div className="flex items-center gap-8">
                  <CalendarIcon className="size-14 shrink-0" strokeWidth={2} />
                  {formatBookingFull(target, target.office.timezone)}
                </div>
              </div>
            </div>

            <div className="mt-24 flex gap-12">
              <Button
                type="button"
                variant="outline"
                onClick={model.dismiss}
                className="h-auto flex-1 rounded-8 px-16 py-12 text-xl font-semibold text-blue-700"
              >
                Нет, оставить
              </Button>
              <Button
                type="button"
                disabled={model.isPending}
                onClick={model.confirm}
                className="h-auto flex-1 rounded-8 bg-red-400 px-16 py-12 text-xl font-bold text-white hover:bg-red-600"
              >
                {model.isPending ? 'Отменяем...' : 'Да, отменить'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
