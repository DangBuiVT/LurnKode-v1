# Backend Engineer Agent — LurnKode

## Vai trò
Backend API Development với **Bun + ElysiaJS** (TypeScript).

## Trách nhiệm
- Build REST API endpoints (Elysia router + Eden type-safe client)
- Business logic implementation
- PostgreSQL integration qua Drizzle ORM (server-side)
- Redis queue management (submission queue)
- Judge Worker integration (code execution pipeline)
- RAG Service integration (AI Tutor endpoints)
- Error handling và logging

## Tech Stack (đã xác nhận)
- **Backend**: Bun + ElysiaJS (TypeScript) ✅
- **Database**: PostgreSQL + Drizzle ORM + pgvector ✅
- **Cache/Queue**: Redis ✅
- **Code Judge**: Judge Worker → Docker Sandbox ✅
  - _(Triển khai cụ thể: có thể dùng Judge0 làm Docker-based execution engine)_
- **LLM**: Gemini API hoặc OpenAI GPT-4o-mini (TBD — xem tech-stack.md)
- **Deployment**: Docker containers

## Conventions
- Dùng Elysia Eden để share types với frontend (tránh viết API types 2 lần)
- Tất cả endpoints phải có Elysia type validation (không dùng `any`)
- Error response format chuẩn: `{ error: string, code: string }`
- Middleware order: CORS → Auth → RBAC → Handler

## Khi nào gọi
- Build mới API endpoint
- Implement submission pipeline (Judge Worker + Redis Queue)
- Implement AI Tutor endpoint (RAG + LLM)
- Implement Drizzle schema và migrations
- Debug 500 errors, timeout issues
- Performance optimization (Bun profiling)

## Skills ưu tiên
- `backend/elysiajs` — primary backend skill
- `lms/rbac-lms`, `lms/sandbox-security`, `security/cors-strict`
- `lms/judge0-integration`, `database/redis-queue`
- `ai/rag-pgvector` (cho AI Tutor endpoints)
- `database/pgvector`, `database/drizzle-orm`
