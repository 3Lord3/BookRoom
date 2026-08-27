import { addDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Clock, Info, TriangleAlert } from 'lucide-react';

import {
  MAX_AHEAD_DAYS,
  TIME_STEP_MINUTES,
  WORK_DAY_END_MINUTES,
  WORK_DAY_START_MINUTES,
} from '@shared/config/schedule';
import { cn } from '@shared/lib/cn';
import { formatDateWithShortWeekday, todayInTimezone } from '@shared/lib/dates';
import { Button } from '@shared/ui/button';
import { Calendar } from '@shared/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@shared/ui/form';
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
import { Textarea } from '@shared/ui/textarea';

import type { CreateBookingModel } from '../model/use-create-booking';

// Время начала шагом 15 минут из рабочих часов
const START_TIME_OPTIONS = Array.from(
  { length: (WORK_DAY_END_MINUTES - WORK_DAY_START_MINUTES) / TIME_STEP_MINUTES },
  (_, index) => {
    const minutes = WORK_DAY_START_MINUTES + index * TIME_STEP_MINUTES;
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  },
);

// Опции покрывают весь рабочий день: любая длительность из диапазона должна быть в поле
const DURATION_OPTIONS = Array.from(
  { length: (WORK_DAY_END_MINUTES - WORK_DAY_START_MINUTES) / TIME_STEP_MINUTES },
  (_, index) => (index + 1) * TIME_STEP_MINUTES,
);

// Горизонт +30 дней ограничивает повторы 8 вхождениями
const OCCURRENCE_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} мин`;
  }
  if (rest === 0) {
    return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`;
  }
  return `${hours} ч ${rest} мин`;
}

// Конец для подписи длительности
function endTimeLabel(startTime: string, duration: number): string {
  const [hours = 0, minutes = 0] = startTime.split(':').map(Number);
  const endMinutes = hours * 60 + minutes + duration;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;
}

interface CreateBookingDialogProps {
  model: CreateBookingModel;
  subtitle: string;
  timezone: string;
}

export function CreateBookingDialog({ model, subtitle, timezone }: CreateBookingDialogProps) {
  return (
    <Dialog open={model.open} onOpenChange={(open) => !open && model.close()}>
      <DialogContent
        showCloseButton={false}
        className="w-[560px] max-w-[calc(100vw-32px)] gap-0 rounded-20 bg-card p-32 shadow-1 sm:max-w-[560px]"
      >
        {model.conflict ? (
          <ConflictView model={model} />
        ) : (
          <FormView model={model} subtitle={subtitle} timezone={timezone} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormView({ model, subtitle, timezone }: CreateBookingDialogProps) {
  const watched = model.form.watch();

  return (
    <Form {...model.form}>
      <form onSubmit={model.form.handleSubmit(model.submit)} className="flex flex-col gap-0">
        <DialogHeader className="gap-4 text-left">
          <DialogTitle className="text-6xl font-extrabold text-foreground">
            Новое бронирование
          </DialogTitle>
          <DialogDescription className="text-xl text-blue-700">{subtitle}</DialogDescription>
        </DialogHeader>

        <hr className="my-24 border-border" />

        <div className="flex flex-col gap-20">
          <FormField
            control={model.form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-bold text-blue-700">Тема встречи *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Например: Daily Sync"
                    className="h-auto rounded-8 border-border px-14 py-10 text-xl shadow-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-base font-semibold text-red-400" />
              </FormItem>
            )}
          />

          <div className="flex flex-row items-start gap-16">
            <FormField
              control={model.form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-lg font-bold text-blue-700">Дата</FormLabel>
                  <DateField field={field} timezone={timezone} />
                  <FormMessage className="text-base font-semibold text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={model.form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-lg font-bold text-blue-700">Время начала</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-auto w-full justify-start rounded-8 border-border px-14 py-10 text-xl data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100 *:data-[slot=select-value]:flex-1">
                        <Clock className="size-16 shrink-0 text-blue-700" strokeWidth={2} />
                        <SelectValue placeholder="--:--" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="max-h-80">
                      <SelectGroup>
                        {START_TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-base font-semibold text-red-400" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={model.form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-bold text-blue-700">Продолжительность</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <FormControl>
                    <SelectTrigger className="h-auto w-full rounded-8 border-border px-14 py-10 text-xl data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {DURATION_OPTIONS.map((minutes) => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {formatDuration(minutes)} (до {endTimeLabel(watched.startTime, minutes)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage className="text-base font-semibold text-red-400" />
              </FormItem>
            )}
          />

          <div className="flex flex-row items-end gap-16">
            <FormField
              control={model.form.control}
              name="repeat"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-lg font-bold text-blue-700">Повторение</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-auto w-full rounded-8 border-border px-14 py-10 text-xl data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="none">Не повторять</SelectItem>
                        <SelectItem value="weekly">Каждую неделю</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-base font-semibold text-red-400" />
                </FormItem>
              )}
            />

            {watched.repeat === 'weekly' && (
              <FormField
                control={model.form.control}
                name="occurrences"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-lg font-bold text-blue-700">
                      Количество встреч
                    </FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="h-auto w-full rounded-8 border-border px-14 py-10 text-xl data-[size=default]:h-auto [&>svg]:size-16 [&>svg]:opacity-100">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {OCCURRENCE_OPTIONS.map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              {count} {pluralRu(count, 'встреча', 'встречи', 'встреч')}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-base font-semibold text-red-400" />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={model.form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-bold text-blue-700">Комментарий</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Дополнительная информация для участников встречи..."
                    className="min-h-80 rounded-8 border-border px-14 py-10 text-xl shadow-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-base font-semibold text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {model.summary && (
          <div className="mt-24 flex items-center gap-8 rounded-8 bg-teal-200 px-14 py-14 text-lg font-semibold text-teal-800">
            <Info className="size-16 shrink-0 text-teal-800" strokeWidth={2} />
            <span>{model.summary}</span>
          </div>
        )}

        <DialogFooter className="mt-24 flex flex-row justify-end gap-12">
          <Button
            type="button"
            variant="outline"
            onClick={model.close}
            className="h-auto rounded-8 px-20 py-10 text-xl font-semibold"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={model.isSubmitting}
            className="h-auto rounded-8 px-20 py-10 text-xl font-semibold"
          >
            {model.progress
              ? `Создание ${model.progress.done} из ${model.progress.total}...`
              : model.isSubmitting
                ? 'Создание...'
                : 'Забронировать'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function DateField({
  field,
  timezone,
}: {
  field: {
    value: string;
    onChange: (value: string) => void;
  };
  timezone: string;
}) {
  const { error } = useFormField();
  const selected = field.value ? parseISO(field.value) : undefined;
  const minDate = todayInTimezone(timezone);
  const maxDate = format(addDays(parseISO(minDate), MAX_AHEAD_DAYS), 'yyyy-MM-dd');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <button
            type="button"
            aria-invalid={!!error}
            className={cn(
              'flex h-auto w-full items-center gap-8 rounded-8 border border-input px-14 py-10 text-xl md:text-xl',
              error && 'border-red-400',
            )}
          >
            <CalendarIcon
              className={cn('size-16 shrink-0', error ? 'text-red-400' : 'text-blue-700')}
              strokeWidth={2.5}
            />
            <span className={cn(!field.value && 'text-blue-400')}>
              {field.value
                ? formatDateWithShortWeekday(selected as Date)
                : 'Выберите дату'}
            </span>
          </button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ru}
          selected={selected}
          onSelect={(day) => day && field.onChange(format(day, 'yyyy-MM-dd'))}
          disabled={(day) => {
            const value = format(day, 'yyyy-MM-dd');
            return value < minDate || value > maxDate;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ConflictView({ model }: { model: CreateBookingModel }) {
  return (
    <div className="flex flex-col items-center gap-24 text-center">
      <div className="flex size-64 items-center justify-center rounded-full bg-red-100 text-red-600 [&_svg]:size-32">
        <TriangleAlert strokeWidth={2} />
      </div>

      <DialogHeader className="items-center gap-12 text-center">
        <DialogTitle className="text-6xl font-extrabold text-foreground">
          Время уже занято
        </DialogTitle>
        <DialogDescription className="max-w-[416px] text-2xl text-blue-700">
          Выбранный интервал был забронирован другим сотрудником. Расписание обновлено.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="mt-24 w-full">
        <Button
          type="button"
          onClick={model.resolveConflict}
          className="h-auto w-full rounded-8 px-24 py-12 text-xl font-bold"
        >
          Выбрать другое время
        </Button>
      </DialogFooter>
    </div>
  );
}

export type { CreateBookingDialogProps };
