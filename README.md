# Бронирование переговорных

Веб-приложение для поиска свободной переговорной, бронирования её на нужное время и управления
своими бронированиями. Клиентская часть расположена в `client/`, backend не изменён.

## Технологии

| Слой | Технология |
|---|---|
| Сборка | Vite + `@vitejs/plugin-react` |
| UI | React 19 + TypeScript (strict) |
| Роутинг | react-router v7 (library mode) |
| Стейт | Redux Toolkit 2 + RTK Query (REST-кэш), listener middleware (WS) |
| Стили | Tailwind CSS v4 + shadcn/ui, токены из макета |
| Даты | date-fns v4 + `@date-fns/tz` |
| Real-time | нативный WebSocket-клиент с автопереподключением |
| Тесты | Vitest + Testing Library + MSW v2 |
| Пакеты | pnpm |

## Запуск

Требуется Node.js 20+ и pnpm.

### 1. Backend (`server/`)

```bash
cd server
npm ci
cp .env.example .env
npm run dev
```

Сервис поднимается на `http://localhost:3000`.

### 2. Frontend (`client/`)

```bash
cd client
pnpm install
cp .env.example .env.local   # VITE_API_URL, по умолчанию http://localhost:3000
pnpm dev
```

Приложение открывается на `http://localhost:5173`.

### Сброс тестовых данных

```bash
curl -X POST http://localhost:3000/api/v1/test/reset
```

## Архитектура

Клиентская часть написана по методологии FSD, слои сверху вниз:

- `app` — провайдеры (store, router, theme), AppShell, глобальные стили, роуты;
- `pages` — rooms | room-detail | my-bookings | not-found;
- `widgets` — navbar, day-schedule (сетка дня 09–20 со слотами), connection-banner;
- `features` — select-office, filter-rooms, create-booking, cancel-booking, export-booking,
  real-time-sync;
- `entities` — office, room, booking, viewer: типы, RTK Query эндпоинты, селекторы;
- `shared` — ui (shadcn), api (baseApi), lib (dates/slots/ws), config (env).

### Особенности
- Импорты идут только сверху вниз: слой может зависеть от нижележащего, но не от соседнего;
- "Глупый" UI: интерфейс отделён от логики (запросы и обработчики в хуках);
- Один хук на одну фичу;
- Состояния представлены не в виде набора булевых флагов, а как дискриминированный union: (`{ status: 'loading' } | { status: 'error' } |
   { status: 'success'; data }`).

## Ключевые решения

1. Все расчёты и запросы к API в UTC (ISO-строки), а рабочие часы офиса показываются на экране в таймзоне офиса через библиотеку `@date-fns/tz`;
2. Шаг 15 минут: одна константа `shared/config/schedule` (`TIME_STEP_MINUTES`) на всю
   сетку расписания и форму бронирования;
3. WS без подписок: сервер рассылает события всем и не хранит историю. Поэтому после
   переподключения данные повторно запрашиваются по REST, инвалидируя всё видимое на этот момент. Пропущенные за время обрыва события не восстанавливаются;
4. Серверные данные живут в RTK Query. WebSocket только сообщает
   middleware, что данные устарели и их стоит перезапросить (сам ничего не хранит);
5. Форма бронирования на react-hook-form + zod, отмена оптимистичная;
6. Экспорт ICS через собственный генератор: размер фичи слишком мал, чтобы тянуть новую
   зависимость.

## Тесты

- Unit чистых функций, unit кастомных хуков
- Интеграционные тесты фич, сеть мокается через MSW
- Рендер оборачивается в `<Provider>` с тестовым store (RTK Query не мокается руками)
- Покрытие тестами ~90%

```bash
cd client
pnpm test          # Vitest, один прогон
pnpm test:watch    # watch-режим
pnpm lint          # ESLint (включая порядок импортов)
pnpm typecheck     # tsc -b
pnpm build         # сборка production
```