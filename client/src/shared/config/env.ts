/**
 * Конфигурация окружения клиента.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
export const API_BASE_URL = `${API_URL}/api/v1`;
