import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { RoomSummary } from '@entities/room';

interface RoomBreadcrumbsProps {
  room: RoomSummary;
}

export function RoomBreadcrumbs({ room }: RoomBreadcrumbsProps) {
  return (
    <nav
      aria-label="Хлебные крошки"
      className="flex items-center gap-8 px-40 pt-24 pb-12 text-xl text-blue-700"
    >
      <Link to="/rooms">Переговорные</Link>
      <ChevronRight className="size-14 shrink-0 text-blue-400" strokeWidth={2.5} />
      <Link to={`/rooms?office=${room.officeId}`}>{room.office.name}</Link>
      <ChevronRight className="size-14 shrink-0 text-blue-400" strokeWidth={2.5} />
      <span className="font-semibold text-blue-900">Комната '{room.name}'</span>
    </nav>
  );
}
