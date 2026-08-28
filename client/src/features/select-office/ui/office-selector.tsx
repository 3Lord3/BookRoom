import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@shared/lib/cn';
import { mskBelt } from '@shared/lib/msk-belt';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { Skeleton } from '@shared/ui/skeleton';

import type { OfficeSelectorModel } from '../model/use-office-selector';

export function OfficeSelector({ model }: { model: OfficeSelectorModel }) {
  const { offices, selected, localTime } = model;
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="Выбор офиса" className="px-40 py-24">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-8 rounded-8 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="text-4xl font-bold">{selected?.name ?? 'Выберите офис'}</span>
            <ChevronDown className="size-16 text-muted-foreground" strokeWidth={2.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-max p-8">
          {offices.status === 'loading' && (
            <div className="flex flex-col gap-4 p-4">
              <Skeleton className="h-12 rounded-6" />
              <Skeleton className="h-12 rounded-6" />
            </div>
          )}
          {offices.status === 'error' && (
            <p className="p-4 text-lg text-destructive">Не удалось загрузить офисы</p>
          )}
          {offices.status === 'success' &&
            offices.data.map((office) => (
              <button
                key={office.id}
                type="button"
                onClick={() => {
                  model.select(office.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full flex-col items-start gap-2 rounded-6 p-8 text-left hover:bg-accent',
                  office.id === selected?.id && 'bg-accent',
                )}
              >
                <span className="text-xl font-semibold">{office.name}</span>
                <span className="flex w-full items-center justify-between gap-4 text-lg text-blue-700">
                  <span>{office.address}</span>
                  <span className="shrink-0">{mskBelt(office.timezone)}</span>
                </span>
              </button>
            ))}
        </PopoverContent>
      </Popover>

      <div className="mt-4 flex items-center gap-12 text-lg text-blue-400">
        <span>{selected?.address ?? 'Адрес не выбран'}</span>
        {selected && (
          <>
            <span aria-hidden className="size-4 rounded-full bg-blue-400" />
            <span>Местное время: {localTime ?? '--:--'}</span>
          </>
        )}
      </div>
    </section>
  );
}
