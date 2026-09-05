# Architecture Rules — DevVerse LMS

## Monorepo Structure
- Cấu trúc: pps/web/, pps/api/, packages/shared-types/
- Shared types phải ở packages/shared-types/ — không define lại ở nhiều chỗ
- Không import trực tiếp giữa pps/web và pps/api (chỉ qua API calls)

## Module Boundaries
- Frontend KHÔNG chứa business logic (chỉ UI + API calls)
- Backend KHÔNG chứa UI logic
- Database migrations CHỈ ở Supabase migration files
- Judge logic KHÔNG mix với course logic

## Service Dependencies
`
Frontend
    ↓ HTTPS (REST API)
Backend API
    ├── Supabase (DB, Auth, Storage)
    ├── Redis (submission queue)
    └── Judge0 (code execution)
`

## ADR Template
Khi quyết định kiến trúc quan trọng, tạo file docs/adr/YYYY-MM-DD-title.md:
`
# ADR: [Title]
## Status: [Proposed | Accepted | Deprecated]
## Context: [Vấn đề gì?]
## Decision: [Quyết định gì?]
## Consequences: [Trade-offs?]
`

## Anti-patterns (KHÔNG làm)
- Không gọi Supabase trực tiếp từ frontend cho sensitive operations
- Không để business logic ở database triggers
- Không hard-code environment-specific values
