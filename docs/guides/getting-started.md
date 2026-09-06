# Getting Started — DevVerse

> Hướng dẫn setup môi trường dev từ đầu cho team members mới.
> **Stack đã xác nhận**: Bun + ElysiaJS (Backend) · Supabase · Redis · Judge0

---

## Prerequisites

Cài đặt các tools sau trước khi bắt đầu:

```bash
# Bun >= 1.1 (KHÔNG dùng Node — backend chạy trên Bun)
bun --version   # >= 1.1.x
# Cài Bun: https://bun.sh
curl -fsSL https://bun.sh/install | bash   # macOS/Linux
powershell -c "irm bun.sh/install.ps1 | iex"  # Windows

# Git
git --version

# Docker Desktop (cần cho Judge0 + Supabase local)
docker --version

# Supabase CLI
npm install -g supabase   # hoặc: brew install supabase/tap/supabase
supabase --version
```

---

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/devverse.git
cd devverse
```

---

## 2. Cài Dependencies

```bash
# Backend (Bun)
cd apps/api
bun install

# Frontend (TBD — Next.js hoặc React+Vite)
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
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
LLM_PROVIDER=gemini                        # hoặc: openai
GEMINI_API_KEY=...                         # nếu dùng Gemini
OPENAI_API_KEY=sk-...                      # nếu dùng OpenAI
JUDGE0_URL=http://localhost:2358
JUDGE0_AUTH=your_secret_token
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
PORT=3001

# Frontend: apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. Setup Supabase Local Dev

```bash
# Init Supabase local (lần đầu)
supabase init

# Link đến cloud project
supabase link --project-ref YOUR_PROJECT_REF

# Start local Supabase (PostgreSQL + Studio + Auth + Storage)
supabase start

# Apply migrations
supabase db reset
```

Sau khi `supabase start`:
- **Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **DB**: `postgresql://postgres:postgres@localhost:54322/postgres`

---

## 5. Bật pgvector Extension

Trong SQL Editor của Supabase Studio, chạy:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## 6. Chạy Judge0 Local (Docker)

Judge0 cần Docker. Chạy lần đầu sẽ pull image (~2 phút):

```bash
cd infra/judge0
docker compose up -d

# Verify health
curl http://localhost:2358/system_info
# → {"version":"1.x.x", ...}
```

> 💡 Judge0 cần Redis. Docker Compose đã include Redis — không cần cài riêng.

---

## 7. Chạy Development Servers

```bash
# Terminal 1 — Backend (Bun + ElysiaJS)
cd apps/api
bun run dev
# → API chạy tại http://localhost:3001

# Terminal 2 — Frontend (TBD)
cd apps/web
bun run dev   # hoặc: npm run dev
# → Frontend tại http://localhost:3000

# Terminal 3 — Supabase local (nếu chưa chạy)
supabase start
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

## 9. Verify Setup

```bash
# API health check
curl http://localhost:3001/health
# → {"status":"ok","version":"0.1.0"}

# Judge0 health
curl http://localhost:2358/system_info

# Supabase local
curl http://localhost:54321/rest/v1/ -H "apikey: YOUR_ANON_KEY"
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
| `supabase start` fail | Docker chưa chạy | Mở Docker Desktop |
| `401 Unauthorized` | Token sai hoặc hết hạn | Check `SUPABASE_ANON_KEY` |
| `permission denied` (Supabase) | RLS block | Check policy cho table đó |
| Judge0 không respond | Docker chưa start | `cd infra/judge0 && docker compose up -d` |
| `pgvector not found` | Extension chưa bật | `CREATE EXTENSION vector;` |
| Bun command not found | Bun chưa cài | Cài tại https://bun.sh |
| Port 3001 busy | Process cũ chưa kill | `lsof -ti:3001 \| xargs kill` |

---

## Next Steps

- Đọc [tech-stack.md](./tech-stack.md) — kiến trúc tổng quan, stack decisions
- Đọc [environment-setup.md](./environment-setup.md) — cấu hình `.env` chi tiết
- Đọc [agents/how-to-use-skills.md](../agents/how-to-use-skills.md) — dùng AI agent skills
- Xem `.agents/rules/workflow-plan.md` — workflow khi build feature mới
