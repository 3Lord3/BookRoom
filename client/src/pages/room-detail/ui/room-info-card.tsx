import type { RoomSummary } from '@entities/room';

import { CapacityIcon, FeatureIcon } from './feature-icon';

export function RoomInfoCard({ room }: { room: RoomSummary }) {
  return (
    <article className="flex flex-col gap-20 rounded-16 border border-border bg-card p-24">
      <header className="flex flex-col gap-8">
        <h1 className="text-7xl font-extrabold">{room.name}</h1>
        <p className="text-xl text-blue-700">{`${room.office.name} · ${room.office.address}`}</p>
      </header>

      <hr className="border-border" />

      <ul className="flex flex-col gap-12">
        <li className="flex items-center gap-12 text-xl text-blue-900">
          <CapacityIcon />
          Вместимость: до {room.capacity} человек
        </li>
        {room.features.map((feature) => (
          <li key={feature.code} className="flex items-center gap-12 text-xl text-blue-900">
            <FeatureIcon code={feature.code} />
            {feature.name}
          </li>
        ))}
      </ul>
    </article>
  );
}
