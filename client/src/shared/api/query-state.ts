import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import type { ApiErrorBody } from './types';

// Дискриминированный union вместо булевых флагов загрузки
export type QueryState<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T };

interface QueryResultLike<T> {
  data?: T;
  error?: unknown;
  isLoading: boolean;
}

// Ошибка API приходит в конверте { error: { code, message } }
function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const body = (error as FetchBaseQueryError).data;
    if (body && typeof body === 'object' && 'error' in body) {
      const message = (body as ApiErrorBody).error.message;
      if (message) {
        return message;
      }
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз';
}

export function toQueryState<T>(result: QueryResultLike<T>): QueryState<T> {
  if (result.isLoading) {
    return { status: 'loading' };
  }
  if (result.error !== undefined) {
    return { status: 'error', message: extractMessage(result.error) };
  }
  return { status: 'success', data: result.data as T };
}
