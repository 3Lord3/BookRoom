import { useSearchParams } from 'react-router-dom';

import { useGetOfficesQuery, type Office } from '@entities/office';
import { toQueryState, type QueryState } from '@shared/api/query-state';

import { useLocalTime } from './use-local-time';

export interface OfficeSelectorModel {
  offices: QueryState<Office[]>;
  selectedId: string | null;
  selected: Office | null;
  /** «14:35 МСК» для выбранного офиса либо null */
  localTime: string | null;
  select: (officeId: string) => void;
}

/**
 * Выбранный офис живёт в searchParams (?office=), поэтому ссылка
 * на отфильтрованный список можно расшарить, а выбор переживает перезагрузку.
 */
export function useOfficeSelector(): OfficeSelectorModel {
  const [searchParams, setSearchParams] = useSearchParams();
  const officesResult = useGetOfficesQuery();

  const selectedId = searchParams.get('office');
  const selected = officesResult.data?.find((office) => office.id === selectedId) ?? null;

  return {
    offices: toQueryState(officesResult),
    selectedId,
    selected,
    localTime: useLocalTime(selected?.timezone ?? null),
    select: (officeId) => {
      const next = new URLSearchParams(searchParams);
      next.set('office', officeId);
      setSearchParams(next);
    },
  };
}
