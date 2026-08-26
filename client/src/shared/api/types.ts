export interface ApiErrorBody {
  error: {
    code: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

/** Коды ошибок, которые фронтенд обрабатывает программно. */
export const API_ERROR_CODES = {
  bookingConflict: 'BOOKING_CONFLICT',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Достаёт machine-readable код ошибки из FetchBaseQueryError, если это ошибка API. */
export function getApiErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const body = (error as { data: unknown }).data;
    if (body && typeof body === 'object' && 'error' in body) {
      const code = (body as ApiErrorBody).error.code;
      return code ?? null;
    }
  }
  return null;
}
