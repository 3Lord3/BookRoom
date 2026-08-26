import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, TriangleAlert } from 'lucide-react';

import {
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';
import { cn } from '@shared/lib/cn';
import { Button } from '@shared/ui/button';
import { Calendar } from '@shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { Skeleton } from '@shared/ui/skeleton';

import {
  useDaySchedule,
  type DayScheduleContent,
  type ScheduleEventModel,
} from '../model/use-day-schedule';

/** Высота часовой строки из макета */
const HOUR_ROW_HEIGHT_PX = 48;
const PX_PER_MINUTE = HOUR_ROW_HEIGHT_PX / 60;

const HOUR_LABELS = Array.from(
  { length: WORK_DAY_END_MINUTES / 60 - WORK_DAY_START_MINUTES / 60 + 1 },
  (_, index) => `${String(WORK_DAY_START_MINUTES / 60 + index).padStart(2, '0')}:00`,
);

interface DayScheduleProps {
  roomId: string;
  timezone: string;
}

export function DaySchedule({ roomId, timezone }: DayScheduleProps) {
  const model = useDaySchedule(roomId, timezone);

  return (
    <section
      aria-label="Расписание комнаты"
      className="flex flex-col gap-24 rounded-16 border border-border bg-card p-32"
    >
      {model.content.status === 'loading' && <DayScheduleSkeleton />}

      {model.content.status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-24 py-80 text-center">
          <div className="flex size-120 items-center justify-center rounded-full bg-red-100 text-red-600 [&_svg]:size-48">
            <TriangleAlert strokeWidth={2} />
          </div>
          <div className="flex max-w-[420px] flex-col items-center gap-12">
            <h2 className="text-6xl font-extrabold">Не удалось загрузить расписание</h2>
            <p className="text-xl text-blue-700">{model.content.message}</p>
          </div>
          <Button
            onClick={model.content.retry}
            className="h-auto rounded-8 px-24 py-12 text-xl font-bold"
          >
            Попробовать снова
          </Button>
        </div>
      )}

      {model.content.status === 'success' && (
        <>
          <header className="flex items-center justify-between">
            <div className="flex flex-col gap-4">
              <h2 className="text-5xl font-extrabold">Расписание на день</h2>
              <p className="text-xl text-blue-700">{model.dateLabel}</p>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                {/* Кнопка выбора дня из макета: календарь + подпись */}
                <button
                  type="button"
                  className="flex items-center gap-8 rounded-8 border border-border px-16 py-10 text-xl font-semibold"
                >
                  <CalendarIcon className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
                  Выбрать дату
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  locale={ru}
                  selected={model.date ? parseISO(model.date) : undefined}
                  onSelect={(day) => day && model.selectDate(format(day, 'yyyy-MM-dd'))}
                  disabled={(day) => {
                    const value = format(day, 'yyyy-MM-dd');
                    return value < model.minDate || value > model.maxDate;
                  }}
                />
              </PopoverContent>
            </Popover>
          </header>

          <Timeline content={model.content} />

          <footer className="flex items-center justify-end py-12">
            <Button
              disabled={!model.content.bookedInterval}
              onClick={model.content.book}
              className="h-auto rounded-8 px-24 py-10 text-xl font-semibold"
            >
              Забронировать комнату
            </Button>
          </footer>
        </>
      )}
    </section>
  );
}

function HourRow({ label }: { label: string }) {
  return (
    <div className="grid h-48 grid-cols-[60px_1fr]">
      <span className="self-start text-lg leading-none text-blue-400">{label}</span>
      <div aria-hidden className="border border-border" />
    </div>
  );
}

function Timeline({ content }: { content: Extract<DayScheduleContent, { status: 'success' }> }) {
  return (
    <div className="relative flex flex-col">
      {HOUR_LABELS.map((label) => (
        <HourRow key={label} label={label} />
      ))}

      <div className="absolute inset-y-0 left-60 right-0">
        {content.events.map((event) => (
          <EventBlock key={event.key} event={event} />
        ))}
        {content.slots.map(
          (slot, index) =>
            !slot.busy && (
              <button
                key={slot.start}
                type="button"
                aria-label={`${slotTimeLabel(slot)} свободно`}
                aria-pressed={
                  content.selection !== null &&
                  index >= content.selection.startIndex &&
                  index <= content.selection.endIndex
                }
                onClick={() => content.onSlotClick(index)}
                style={{
                  top: `${(slot.start - WORK_DAY_START_MINUTES) * PX_PER_MINUTE}px`,
                  height: `${TIME_STEP_MINUTES * PX_PER_MINUTE}px`,
                }}
                className={cn(
                  'absolute inset-x-0 cursor-pointer rounded-8 border border-transparent transition-colors hover:bg-teal-200/40',
                  'aria-pressed:border-teal-700 aria-pressed:bg-teal-200/60',
                )}
              />
            ),
        )}
      </div>
    </div>
  );
}

/** Блок бронирования поверх сетки: своё — с названием, чужое — «Занято» */
function EventBlock({ event }: { event: ScheduleEventModel }) {
  return (
    <div
      style={{
        top: `${(event.start - WORK_DAY_START_MINUTES) * PX_PER_MINUTE}px`,
        height: `${(event.end - event.start) * PX_PER_MINUTE}px`,
      }}
      className={cn(
        'absolute inset-x-0 flex items-center overflow-hidden rounded-8 border px-16 text-xl font-semibold',
        event.kind === 'own'
          ? 'border-teal-700 bg-teal-200 text-teal-800'
          : 'border-border bg-blue-50-2 text-blue-900',
      )}
    >
      <span className="truncate">{event.label}</span>
    </div>
  );
}

export function DayScheduleSkeleton() {
  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-8">
          <Skeleton className="h-24 w-[204px] rounded-4 bg-gray-100" />
          <Skeleton className="h-16 w-[133px] rounded-4 bg-gray-100" />
        </div>
        <Skeleton className="h-39 w-[149px] rounded-8 bg-gray-100" />
      </header>
      <div className="flex flex-col">
        {HOUR_LABELS.map((label) => (
          <HourRow key={label} label={label} />
        ))}
      </div>
    </>
  );
}

function slotTimeLabel(slot: { start: number; end: number }): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return `${toTime(slot.start)}–${toTime(slot.end)}`;
}
