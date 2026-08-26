/** Общие константы расписания: шаг слотов и рабочие часы офиса (в минутах от полуночи). */
export const TIME_STEP_MINUTES = 15;
export const WORK_DAY_START_MINUTES = 9 * 60;
export const WORK_DAY_END_MINUTES = 20 * 60;

/** Бронирования не дальше чем +30 дней от текущего момента (правило ТЗ). */
export const MAX_AHEAD_DAYS = 30;
