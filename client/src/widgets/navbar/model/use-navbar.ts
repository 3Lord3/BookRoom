import { useGetViewerQuery, type User } from '@entities/viewer';
import { toQueryState, type QueryState } from '@shared/api/query-state';

interface NavbarLink {
  to: string;
  label: string;
}

interface NavbarModel {
  links: readonly NavbarLink[];
  viewer: QueryState<User>;
}

const LINKS = [
  { to: '/rooms', label: 'Переговорные' },
  { to: '/bookings', label: 'Мои бронирования' },
] as const;

export function useNavbar(): NavbarModel {
  const viewerResult = useGetViewerQuery();

  return {
    links: LINKS,
    viewer: toQueryState(viewerResult),
  };
}
