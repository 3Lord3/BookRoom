import { addDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { useState } from 'react';

import { MAX_AHEAD_DAYS } from '@shared/config/schedule';
import { cn } from '@shared/lib/cn';
import { todayInTimezone } from '@shared/lib/dates';
import { Calendar } from '@shared/ui/calendar';
import { Input } from '@shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';

import { formatDateLabel } from '../lib/format-date-label';
import { formatDuration } from '../lib/format-duration';
import { applyTimeMask, isAlignedToStep, isValidTime } from '../lib/time';
import type { RoomFiltersModel } from '../model/use-room-filters';

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120] as const;
const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12] as const;

/** Обёртка контрола из макета: иконка + значение в рамке с радиусом 8 */
const controlClass =
  'flex h-auto w-auto items-center gap-8 rounded-8 border border-border bg-transparent px-14 py-10 text-xl font-normal text-foreground shadow-none';

function FilterItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-6">
      <span className="text-sm font-bold uppercase text-blue-400">{label}</span>
      {children}
    </label>
  );
}

function DateControl({ model, timezone }: { model: RoomFiltersModel; timezone: string | null }) {
  // Границы календаря сравниваем по строкам YYYY-MM-DD в таймзоне офиса,
  // а не по инстантам — иначе сутки съезжают при несовпадении зон браузера и офиса
  const minDate = timezone ? todayInTimezone(timezone) : null;
  const maxDate = minDate ? format(addDays(parseISO(minDate), MAX_AHEAD_DAYS), 'yyyy-MM-dd') : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={controlClass}>
          <CalendarIcon className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
          <span>{model.date ? formatDateLabel(model.date) : 'Выберите дату'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ru}
          selected={model.date ? parseISO(model.date) : undefined}
          onSelect={(day) => day && model.setDate(format(day, 'yyyy-MM-dd'))}
          disabled={
            minDate && maxDate
              ? (day) => {
                  const value = format(day, 'yyyy-MM-dd');
                  return value < minDate || value > maxDate;
                }
              : true
          }
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeControl({ model }: { model: RoomFiltersModel }) {
  // Черновик ввода живёт локально; при внешней смене времени (сброс, другой офис)
  // контрол пересоздаётся через key с актуальным начальным значением
  const [draft, setDraft] = useState(model.time ?? '');

  const commit = () => {
    if (isValidTime(draft) && isAlignedToStep(draft)) {
      if (draft !== model.time) {
        model.setTime(draft);
      }
      return;
    }
    setDraft(model.time ?? '');
  };

  return (
    <div className={controlClass}>
      <Clock className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
      <Input
        value={draft}
        onChange={(event) => setDraft(applyTimeMask(event.target.value))}
        onBlur={commit}
        placeholder="--:--"
        inputMode="numeric"
        className="h-auto w-40 border-none px-0 py-0 text-xl shadow-none focus-visible:ring-0 md:text-xl"
      />
    </div>
  );
}

export function RoomFilters({
  model,
  timezone,
}: {
  model: RoomFiltersModel;
  timezone: string | null;
}) {
  return (
    <section aria-label="Фильтры переговорных" className="flex items-center gap-16 px-40 py-20">
      <FilterItem label="Дата">
        <DateControl model={model} timezone={timezone} />
      </FilterItem>

      <FilterItem label="Время начала">
        <TimeControl key={model.time ?? ''} model={model} />
      </FilterItem>

      <FilterItem label="Длительность">
        <Select
          value={String(model.duration)}
          onValueChange={(value) => model.setDuration(Number(value))}
        >
          <SelectTrigger
            className={cn(
              controlClass,
              // База shadcn задаёт фиксированную высоту по data-size — выравниваем с кнопками фильтров
              'data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100',
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {DURATION_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatDuration(minutes)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterItem>

      <FilterItem label="Вместимость">
        <Select
          value={model.capacity === null ? '' : String(model.capacity)}
          onValueChange={(value) => model.setCapacity(value === '' ? null : Number(value))}
        >
          <SelectTrigger
            className={cn(
              controlClass,
              // База shadcn задаёт фиксированную высоту по data-size — выравниваем с кнопками фильтров
              'data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100',
            )}
          >
            <Users className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
            <SelectValue placeholder="Не указано" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {CAPACITY_OPTIONS.map((capacity) => (
                <SelectItem key={capacity} value={String(capacity)}>
                  Мин. {capacity} чел.
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterItem>
    </section>
  );
}
