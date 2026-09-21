# Architecture Rules — LurnKode LMS

## Monorepo Structure
- Cấu trúc: `apps/web/`, `apps/api/`, `packages/shared-types/`
- Shared types phải ở `packages/shared-types/` — không define lại ở nhiều chỗ
- Không import trực tiếp giữa `apps/web` và `apps/api` (chỉ qua REST API calls)

## Module Boundaries
- Frontend KHÔNG chứa business logic (chỉ UI + API calls)
- Backend KHÔNG chứa UI logic
- Database migrations CHỈ ở Drizzle ORM migration files
- Judge logic KHÔNG mix với course logic
- Untrusted code CHỈ chạy bên trong Docker Sandbox — không bao giờ trong API process

## Service Dependencies
```
Frontend (Next.js)
    ↓ HTTPS (REST API + JWT)
Backend API (Bun + ElysiaJS)
    ├── PostgreSQL + pgvector (Drizzle ORM)
    ├── Redis (submission queue + cache)
    └── Judge Worker → Docker Sandbox
```

## ADR Template
Khi quyết định kiến trúc quan trọng, tạo file `docs/adr/YYYY-MM-DD-title.md`:
```
# ADR: [Title]
## Status: [Proposed | Accepted | Deprecated]
## Context: [Vấn đề gì?]
## Decision: [Quyết định gì?]
## Consequences: [Trade-offs?]
```

## Anti-patterns (KHÔNG làm)
- Không gọi Database trực tiếp từ frontend
- Không để business logic ở database triggers
- Không hard-code environment-specific values
- Không chạy submitted code trực tiếp trong API process hoặc trên host
