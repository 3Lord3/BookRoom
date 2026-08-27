import { useGetViewerQuery, type User } from '@entities/viewer';
import { toQueryState, type QueryState } from '@shared/api/query-state';

interface NavbarLink {
  to: string;
  label: string;
}

interface NavbarModel {
  links: readonly NavbarLink[];
  viewer: QueryState<User>;
  // Краткая форма имени: «Константин К.»
  shortDisplayName: string | null;
}

const LINKS = [
  { to: '/rooms', label: 'Переговорные' },
  { to: '/bookings', label: 'Мои бронирования' },
] as const;

function shortName(displayName: string): string {
  const [first = '', last = ''] = displayName.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

export function useNavbar(): NavbarModel {
  const viewerResult = useGetViewerQuery();
  const viewer = toQueryState(viewerResult);

  return {
    links: LINKS,
    viewer,
    shortDisplayName:
      viewer.status === 'success' ? shortName(viewer.data.displayName) : null,
  };
}
