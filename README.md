# InventoryFlow

Monorepo for a course project:

- `backend/` - NestJS (REST API)
- `frontend/` - React + TypeScript (Vite)
- PostgreSQL via Docker Compose

## Requirements

- Docker Desktop (or Docker Engine) + Docker Compose

## Local development

1. Start services:

   `docker compose up --build`

2. Frontend: http://localhost:5173
3. Backend health endpoint: http://localhost:3001/health

## Repo layout

- `backend/` - backend app (NestJS)
- `frontend/` - frontend app (React)

