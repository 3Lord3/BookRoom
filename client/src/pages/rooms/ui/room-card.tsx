import { Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import type { RoomSummary } from '@entities/room';
import { cn } from '@shared/lib/cn';
import { Button } from '@shared/ui/button';

function AvailabilityBar({ available }: { available: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-8 rounded-8 p-10 text-base font-semibold',
        available ? 'bg-teal-200 text-teal-800' : 'bg-blue-100 text-blue-700',
      )}
    >
      <span
        aria-hidden
        className={cn('size-6 rounded-full', available ? 'bg-teal-700' : 'bg-blue-400')}
      />
      {available ? 'Доступно на выбранное время' : 'Недоступно на выбранное время'}
    </div>
  );
}

export function RoomCard({ room }: { room: RoomSummary }) {
  const location = useLocation();
  // Интервал и вместимость переносим в детали комнаты: расписание сразу откроется с ними
  const detailUrl = `/rooms/${room.id}${location.search}`;

  return (
    <article className="flex flex-col gap-16 rounded-16 border border-border bg-card p-20">
      <header className="flex flex-col gap-4">
        <h3 className="truncate text-4xl font-bold">{room.name}</h3>
        <p className="text-lg text-blue-700">{room.floor} этаж</p>
      </header>

      <div className="flex flex-col gap-8 text-lg text-blue-700">
        <div className="flex items-center gap-8">
          <Users className="size-16 shrink-0" strokeWidth={2} />
          Вместимость: до {room.capacity} человек
        </div>
      </div>

      {room.available !== undefined && <AvailabilityBar available={room.available} />}

      <div className="flex items-center gap-12">
        <Button
          asChild
          variant="outline"
          className="h-auto flex-1 rounded-8 px-16 py-10 text-xl font-semibold"
        >
          <Link to={detailUrl}>Подробнее</Link>
        </Button>
        {room.available === false ? (
          // Недоступную комнату не ведём на бронирование — кнопка только визуально заблокирована
          <Button
            className="h-auto flex-1 rounded-8 px-16 py-10 text-xl font-semibold opacity-60"
            disabled
          >
            Забронировать
          </Button>
        ) : (
          <Button asChild className="h-auto flex-1 rounded-8 px-16 py-10 text-xl font-semibold">
            <Link to={detailUrl}>Забронировать</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
