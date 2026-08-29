// Время в минутах от полуночи
// Шаг сетки времени и длительностей, зеркалит правило бэкенда (booking-rules.ts)
export const TIME_STEP_MINUTES = 15;
export const WORK_DAY_START_MINUTES = 9 * 60;
export const WORK_DAY_END_MINUTES = 20 * 60;

// Потолок длительности в фильтрах списка; в самой форме она ограничена рабочим днём
export const MAX_FILTER_DURATION_MINUTES = 2 * 60;

// Горизонт бронирования +30 дней (правило ТЗ)
export const MAX_AHEAD_DAYS = 30;

// Границы серии повторов. Верхний предел нужен и самой валидации: без него проверка
// горизонта строит серию любой длины и вешает вкладку
export const MIN_OCCURRENCES = 2;
export const MAX_OCCURRENCES = MAX_AHEAD_DAYS + 1;
