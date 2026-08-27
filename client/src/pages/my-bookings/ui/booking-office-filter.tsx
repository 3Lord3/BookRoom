import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import type { OfficeSelectorModel } from '@features/select-office';
import { cn } from '@shared/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { Skeleton } from '@shared/ui/skeleton';

export function BookingOfficeFilter({ model }: { model: OfficeSelectorModel }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-[39px] cursor-pointer items-center gap-8 rounded-8 border border-border bg-card px-16 text-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {model.selected?.name ?? 'Все офисы'}
          <ChevronDown className="size-16 text-blue-700" strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-max p-8">
        {model.offices.status === 'loading' && (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-12 rounded-6" />
            <Skeleton className="h-12 rounded-6" />
          </div>
        )}
        {model.offices.status === 'error' && (
          <p className="p-4 text-lg text-destructive">Не удалось загрузить офисы</p>
        )}
        {model.offices.status === 'success' && (
          <div className="flex w-max min-w-[220px] flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                model.clear();
                setOpen(false);
              }}
              className="flex cursor-pointer items-center justify-between gap-16 rounded-6 px-8 py-6 text-left text-xl hover:bg-accent"
            >
              Все офисы
              {!model.selected && <Check className="size-16 text-teal-700" strokeWidth={2.5} />}
            </button>
            {model.offices.data.map((office) => (
              <button
                key={office.id}
                type="button"
                onClick={() => {
                  model.select(office.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-16 rounded-6 px-8 py-6 text-left text-xl hover:bg-accent',
                  office.id === model.selectedId && 'bg-accent',
                )}
              >
                <span className="flex flex-col items-start">
                  <span>{office.name}</span>
                  <span className="text-lg text-blue-700">{office.address}</span>
                </span>
                {office.id === model.selectedId && (
                  <Check className="size-16 text-teal-700" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
