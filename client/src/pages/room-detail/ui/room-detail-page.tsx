import { ChevronRight, TriangleAlert } from 'lucide-react';

import { Skeleton } from '@shared/ui/skeleton';
import { StateBlock } from '@shared/ui/state-block';
import { DaySchedule, DayScheduleSkeleton } from '@widgets/day-schedule';

import { RoomBreadcrumbs } from './room-breadcrumbs';
import { RoomInfoCard } from './room-info-card';
import { useRoomDetailPage } from '../model/use-room-detail-page';

const BAR = 'bg-gray-100';
// Вторичный оттенок плейсхолдеров (иконки фич, кнопка выбора дня) из макета
const BAR_ALT = 'bg-blue-100-2';

function BreadcrumbsSkeleton() {
  return (
    <div className="flex items-center gap-8 px-40 pt-24 pb-12">
      <Skeleton className={`h-18 w-[99px] rounded-4 ${BAR}`} />
      <ChevronRight className="size-14 text-blue-400" strokeWidth={2} />
      <Skeleton className={`h-18 w-[89px] rounded-4 ${BAR}`} />
      <ChevronRight className="size-14 text-blue-400" strokeWidth={2} />
      <Skeleton className={`h-18 w-[127px] rounded-4 ${BAR}`} />
    </div>
  );
}

function InfoCardSkeleton() {
  return (
    <article className="flex flex-col gap-20 rounded-16 border border-border bg-card p-24">
      <div className="flex flex-col gap-8">
        <Skeleton className={`h-32 w-[160px] rounded-4 ${BAR}`} />
        <Skeleton className={`h-18 w-full rounded-4 ${BAR}`} />
      </div>
      <Skeleton className={`h-px w-full ${BAR}`} />
      <div className="flex flex-col gap-12">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-12">
            <Skeleton className={`size-18 shrink-0 rounded-4 ${BAR_ALT}`} />
            <Skeleton className={`h-18 w-full rounded-4 ${BAR}`} />
          </div>
        ))}
      </div>
    </article>
  );
}

export function RoomDetailPage() {
  const { content } = useRoomDetailPage();

  if (content.status === 'loading') {
    return (
      <main className="mx-auto flex w-full max-w-[1440px] grow flex-col">
        <BreadcrumbsSkeleton />
        <div className="flex flex-grow gap-32 px-40 pb-48">
          <InfoCardSkeleton />
          <section
            aria-label="Расписание комнаты"
            className="flex min-w-0 flex-1 flex-col gap-24 rounded-16 border border-border bg-card p-32"
          >
            <DayScheduleSkeleton />
          </section>
        </div>
      </main>
    );
  }

  if (content.status === 'error') {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[1440px] grow flex-col">
        <StateBlock
          tone="red"
          icon={<TriangleAlert strokeWidth={2} />}
          title="Не удалось загрузить данные"
          subtitle={content.message}
          action={{ label: 'Попробовать снова', onClick: content.retry }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[1440px] grow flex-col">
      <RoomBreadcrumbs room={content.room} />
      <div className="flex grow gap-32 px-40 pb-48">
        {/* Левая колонка фиксированной ширины из макета */}
        <div className="flex w-[420px] shrink-0 flex-col gap-24">
          <RoomInfoCard room={content.room} />
        </div>
        <div className="min-w-0 flex-1">
          <DaySchedule roomId={content.room.id} timezone={content.room.office.timezone} />
        </div>
      </div>
    </main>
  );
}
