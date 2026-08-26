import { Skeleton } from '@shared/ui/skeleton';

const BAR = 'bg-gray-100';

/** Строка статистики скелетона: плейсхолдер иконки + текстовый бар */
function StatRow() {
  return (
    <div className="flex items-center gap-8">
      <Skeleton className={`size-16 shrink-0 rounded-8 ${BAR}`} />
      <Skeleton className={`h-16 w-[200px] max-w-full rounded-4 ${BAR}`} />
    </div>
  );
}

/** Заглушка карточки на время загрузки списка — по структуре room-card из макета */
export function RoomCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-16 rounded-16 border border-border bg-card p-20">
      <div className="flex flex-col gap-4">
        <Skeleton className={`h-24 w-120 rounded-4 ${BAR}`} />
        <Skeleton className={`h-18 w-48 rounded-4 ${BAR}`} />
      </div>
      <div className="flex flex-col gap-8">
        <StatRow />
        <StatRow />
      </div>
      <Skeleton className={`h-36 w-full rounded-8 ${BAR}`} />
      <div className="mt-auto flex items-center gap-12">
        <Skeleton className={`h-40 flex-1 rounded-8 ${BAR}`} />
        <Skeleton className={`h-40 flex-1 rounded-8 ${BAR}`} />
      </div>
    </div>
  );
}
