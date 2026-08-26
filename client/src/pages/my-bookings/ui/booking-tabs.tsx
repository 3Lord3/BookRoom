import { cn } from '@shared/lib/cn';

import type { MyBookingsTab } from '../model/use-my-bookings-page';

interface BookingTabsProps {
  tab: MyBookingsTab;
  upcomingCount: number;
  onChange: (tab: MyBookingsTab) => void;
}

export function BookingTabs({ tab, upcomingCount, onChange }: BookingTabsProps) {
  return (
    <nav aria-label="Бронирования" className="flex gap-24 border-b border-border">
      <button
        type="button"
        onClick={() => onChange('upcoming')}
        className={cn(
          'cursor-pointer border-b-2 pb-12 text-3xl transition-colors',
          tab === 'upcoming'
            ? 'border-teal-700 font-semibold text-teal-700'
            : 'border-transparent font-medium text-blue-700 hover:text-teal-700',
        )}
      >
        Предстоящие ({upcomingCount})
      </button>
      <button
        type="button"
        onClick={() => onChange('past')}
        className={cn(
          'cursor-pointer border-b-2 pb-12 text-3xl transition-colors',
          tab === 'past'
            ? 'border-teal-700 font-semibold text-teal-700'
            : 'border-transparent font-medium text-blue-700 hover:text-teal-700',
        )}
      >
        Прошедшие
      </button>
    </nav>
  );
}
