import { Calendar, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { CancelBookingDialog } from '@features/cancel-booking';
import { StateBlock } from '@shared/ui/state-block';

import { BookingCard } from './booking-card';
import { BookingCardSkeleton } from './booking-card-skeleton';
import { BookingOfficeFilter } from './booking-office-filter';
import { BookingTabs } from './booking-tabs';
import { useMyBookingsPage } from '../model/use-my-bookings-page';

const SKELETON_COUNT = 2;

export function MyBookingsPage() {
  const model = useMyBookingsPage();
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[1440px] grow flex-col">
      <div className="flex grow flex-col gap-32 p-40">
        <header className="flex items-center justify-between">
          <h1 className="text-8xl font-extrabold">Мои бронирования</h1>
          <BookingOfficeFilter model={model.officeSelector} />
        </header>

        <BookingTabs tab={model.tab} upcomingCount={model.upcomingCount} onChange={model.setTab} />

        {model.content.status === 'error' && (
          <StateBlock
            tone="red"
            icon={<TriangleAlert strokeWidth={2.5} />}
            title="Не удалось загрузить данные"
            subtitle="Произошла ошибка при загрузке ваших бронирований"
            action={{ label: 'Попробовать снова', onClick: model.content.retry }}
          />
        )}

        {model.content.status === 'empty' && (
          <StateBlock
            tone="teal"
            icon={<Calendar strokeWidth={2.5} />}
            title="Нет бронирований"
            subtitle={
              model.tab === 'upcoming'
                ? 'У вас пока нет предстоящих бронирований.\nПерейдите в раздел переговорных, чтобы забронировать комнату'
                : 'У вас пока нет прошедших бронирований'
            }
            action={
              model.tab === 'upcoming'
                ? { label: 'Перейти к переговорным', onClick: () => navigate('/rooms') }
                : undefined
            }
          />
        )}

        {(model.content.status === 'loading' || model.content.status === 'success') && (
          <section aria-label="Список бронирований" className="flex flex-col gap-16">
            {model.content.status === 'loading'
              ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                  <BookingCardSkeleton key={index} />
                ))
              : model.content.bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    // Отменять можно только предстоящие бронирования
                    onCancel={model.tab === 'upcoming' ? model.cancel.openCancel : undefined}
                  />
                ))}
          </section>
        )}
      </div>

      <CancelBookingDialog model={model.cancel} />
    </main>
  );
}
