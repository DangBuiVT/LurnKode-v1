# Getting Started — LurnKode

> Hướng dẫn setup môi trường dev từ đầu cho team members mới.  
> **Stack đã xác nhận**: Next.js + TypeScript (Frontend) · Bun + ElysiaJS (Backend) · PostgreSQL + Drizzle ORM · Redis · Docker Sandbox

---

## Prerequisites

Cài đặt các tools sau trước khi bắt đầu:

```bash
# Bun >= 1.1 (KHÔNG dùng Node thuần — backend chạy trên Bun)
bun --version   # >= 1.1.x
# Cài Bun: https://bun.sh
curl -fsSL https://bun.sh/install | bash   # macOS/Linux
powershell -c "irm bun.sh/install.ps1 | iex"  # Windows

# Git
git --version

# Docker Desktop (cần cho Docker Sandbox + PostgreSQL local)
docker --version

# Node.js >= 18 (chỉ cho Next.js frontend nếu không dùng Bun cho FE)
node --version
```

---

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/lurnkode.git
cd lurnkode
```

---

## 2. Cài Dependencies

```bash
# Backend (Bun)
cd apps/api
bun install

# Frontend (Next.js)
cd apps/web
bun install   # hoặc: npm install
```

> ⚠️ **Không dùng `npm install` cho backend** — project dùng Bun runtime.

---

## 3. Setup Environment Variables

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Điền các giá trị vào (xem [environment-setup.md](./environment-setup.md) để biết chi tiết):

```env
# Backend: apps/api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lurnkode
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=gemini                        # hoặc: openai
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=http://localhost:3000
PORT=3001

# Frontend: apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. Setup PostgreSQL + pgvector (Docker)

```bash
# Khởi động PostgreSQL local với pgvector
cd infra/db
docker compose up -d

# Apply Drizzle migrations
cd apps/api
bun run db:migrate

# Seed data (nếu có)
bun run db:seed
```

Sau khi khởi động:
- **PostgreSQL**: `postgresql://postgres:postgres@localhost:5432/lurnkode`

```sql
-- Bật pgvector extension (lần đầu)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

> ℹ️ Nếu dùng **Supabase** làm managed PostgreSQL hosting, thay bước này bằng cấu hình Supabase URL + pgvector sẽ được bật tự động.

---

## 5. Setup Redis (Docker)

```bash
# Khởi động Redis local
docker run -d -p 6379:6379 --name lurnkode-redis redis:alpine

# Verify
redis-cli ping   # → PONG
```

---

## 6. Setup Docker Sandbox (Judge Worker)

Docker Sandbox dùng để chạy submitted code trong môi trường cô lập.

```bash
cd infra/judge
docker compose up -d

# Verify health
curl http://localhost:2358/system_info
# → {"version":"1.x.x", ...}
```

> 💡 Judge Worker cần Docker và Redis. Docker Compose đã include cả hai.  
> ⚙️ Resource limits được enforce: **1 CPU core, 128MB RAM, 3s Timeout**

---

## 7. Chạy Development Servers

```bash
# Terminal 1 — Backend (Bun + ElysiaJS)
cd apps/api
bun run dev
# → API chạy tại http://localhost:3001

# Terminal 2 — Frontend (Next.js)
cd apps/web
bun run dev   # hoặc: npm run dev
# → Frontend tại http://localhost:3000

# Terminal 3 — Judge Worker (nếu chưa chạy qua Docker)
cd apps/judge-worker
bun run dev
```

---

## 8. Chạy Tests

```bash
# Backend (Bun test)
cd apps/api
bun test                        # run all tests
bun test --coverage             # với coverage report
bun test --watch                # watch mode

# Frontend
cd apps/web
bun run test                    # Vitest
bun run test:e2e                # Playwright E2E
```

**Coverage target: ≥ 80%** (enforced trong CI)

---

## 9. Drizzle ORM — Quản lý Database

```bash
cd apps/api

# Tạo migration mới sau khi thay đổi schema
bun run db:generate

# Apply migrations
bun run db:migrate

# Xem Drizzle Studio (UI quản lý DB)
bun run db:studio
```

---

## 10. Verify Setup

```bash
# API health check
curl http://localhost:3001/health
# → {"status":"ok","version":"0.1.0"}

# Judge Worker health
curl http://localhost:2358/system_info

# Redis check
redis-cli ping   # → PONG
```

---

## Git Workflow

```bash
# Bắt đầu feature mới
git checkout main && git pull
git checkout -b feat/your-feature-name

# Sau khi làm xong
git add . && git commit -m "feat: mô tả ngắn gọn"
git push origin feat/your-feature-name
# → Tạo PR trên GitHub → CI chạy → Code review → Merge
```

**Branch naming**: `feat/`, `fix/`, `chore/`, `docs/`

---

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---| 
| PostgreSQL connection refused | Docker chưa chạy | `docker compose up -d` trong `infra/db` |
| `401 Unauthorized` | JWT token sai hoặc hết hạn | Check `Authorization` header |
| `permission denied` (DB) | RLS block | Check policy cho table đó |
| Judge Worker không respond | Docker chưa start | `cd infra/judge && docker compose up -d` |
| `pgvector not found` | Extension chưa bật | `CREATE EXTENSION vector;` |
| Bun command not found | Bun chưa cài | Cài tại https://bun.sh |
| Port 3001 busy | Process cũ chưa kill | `lsof -ti:3001 \| xargs kill` |
| Redis connection refused | Redis chưa chạy | `docker run -d -p 6379:6379 redis:alpine` |

---

## Next Steps

- Đọc [tech-stack.md](./tech-stack.md) — kiến trúc tổng quan, stack decisions
- Đọc [environment-setup.md](./environment-setup.md) — cấu hình `.env` chi tiết
- Đọc [agents/how-to-use-skills.md](../agents/how-to-use-skills.md) — dùng AI agent skills
- Xem `.agents/rules/workflow-plan.md` — workflow khi build feature mới
