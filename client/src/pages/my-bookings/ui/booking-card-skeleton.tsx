import { Skeleton } from '@shared/ui/skeleton';

export function BookingCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-24 rounded-16 border border-border bg-card p-24">
      <div className="flex min-w-0 items-center gap-24">
        <div className="flex h-80 w-80 shrink-0 flex-col items-center justify-center gap-8 rounded-12 bg-blue-50">
          <Skeleton className="h-10 w-48 rounded-4 bg-gray-100" />
          <Skeleton className="h-24 w-32 rounded-4 bg-gray-100" />
        </div>
        <div className="flex min-w-0 flex-col gap-12">
          <Skeleton className="h-18 w-[400px] max-w-full rounded-4 bg-gray-100" />
          <div className="flex items-center gap-8">
            <Skeleton className="h-14 w-[100px] rounded-4 bg-gray-100" />
            <span aria-hidden className="size-4 rounded-full bg-blue-400" />
            <Skeleton className="h-14 w-[80px] rounded-4 bg-gray-100" />
            <span aria-hidden className="size-4 rounded-full bg-blue-400" />
            <Skeleton className="h-14 w-[160px] rounded-4 bg-gray-100" />
          </div>
        </div>
      </div>
      <Skeleton className="h-[38px] w-[100px] shrink-0 rounded-8 bg-blue-50-2" />
    </div>
  );
}
