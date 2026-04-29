# InventoryFlow

Монорепозиторий для курсового проекта:

- `backend/` — NestJS (REST API)
- `frontend/` — React + TypeScript (Vite)
- PostgreSQL через Docker Compose

## Требования

- Docker Desktop (или Docker Engine) + Docker Compose

## Локальная разработка

1. Запустите сервисы:

   `docker compose up --build`

2. Фронтенд: http://localhost:5173
3. Хелсчек бэкенда: http://localhost:3001/health

## Продакшен-подобный Docker (многоступенчатая сборка)

Сборка и запуск продакшен-целей (nginx отдаёт фронтенд на порту 8080):

`docker compose -f docker-compose.prod.yml up --build`

- Фронтенд: http://localhost:8080
- Хелсчек бэкенда: http://localhost:3001/health

## Тесты

Бэкенд:

- Модульные: `cd backend && npm test`
- Линтер: `cd backend && npm run lint`
- E2E (требует Postgres + применённые миграции): `cd backend && npm run test:e2e`

Фронтенд:

- Дымовые тесты: `cd frontend && npm test`
- Сборка: `cd frontend && npm run build`

## Структура репозитория

- `backend/` — приложение бэкенда (NestJS)
- `frontend/` — приложение фронтенда (React)