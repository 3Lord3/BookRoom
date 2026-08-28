import { Building, SearchX, TriangleAlert } from 'lucide-react';

import { RoomFilters } from '@features/filter-rooms';
import { OfficeSelector } from '@features/select-office';
import { StateBlock } from '@shared/ui/state-block';

import { RoomCard } from './room-card';
import { RoomCardSkeleton } from './room-card-skeleton';
import { useRoomsPage } from '../model/use-rooms-page';

const SKELETON_COUNT = 6;

export function RoomsPage() {
  const { officeSelector, filters, timezone, content } = useRoomsPage();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[1440px] grow flex-col">
      <div className="border-b border-border">
        <OfficeSelector model={officeSelector} />
      </div>
      <div className="border-b border-border">
        <RoomFilters model={filters} timezone={timezone} disabled={content.status === 'no-office'} />
      </div>

      {content.status === 'no-office' && (
        <StateBlock
          tone="teal"
          icon={<Building strokeWidth={2.5} />}
          title="Выберите офис"
          subtitle="Для просмотра доступных переговорных сначала выберите офис из списка выше"
        />
      )}

      {content.status === 'error' && (
        <StateBlock
          tone="red"
          icon={<TriangleAlert strokeWidth={2.5} />}
          title="Не удалось загрузить данные"
          subtitle="Произошла ошибка при загрузке списка переговорных"
          action={{ label: 'Попробовать снова', onClick: content.retry }}
        />
      )}

      {content.status === 'empty' && (
        <StateBlock
          tone="gray"
          icon={<SearchX strokeWidth={2.5} />}
          title="Нет доступных переговорных"
          subtitle="Попробуйте изменить параметры фильтрации или выбрать другой офис"
          action={{ label: 'Сбросить фильтры', onClick: filters.reset }}
        />
      )}

      {(content.status === 'loading' || content.status === 'success') && (
        <section className="flex flex-col gap-32 p-40">
          <h1 className="text-6xl font-extrabold">
            {content.status === 'loading'
              ? 'Загрузка переговорных...'
              : 'Доступные переговорные в этом офисе'}
          </h1>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-24">
            {content.status === 'loading'
              ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                  <RoomCardSkeleton key={index} />
                ))
              : content.rooms.map((room) => <RoomCard key={room.id} room={room} />)}
          </div>
        </section>
      )}
    </main>
  );
}
