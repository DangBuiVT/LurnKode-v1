# Getting Started — DevVerse

> Hướng dẫn setup môi trường dev từ đầu cho team members mới.

---

## Prerequisites

Cài đặt các tools sau trước khi bắt đầu:

```bash
# Node.js >= 20 (hoặc Bun >= 1.1 nếu dùng Bun stack)
node --version   # >= 20.x

# Python 3.11+ (nếu dùng FastAPI stack)
python --version  # >= 3.11

# Git
git --version

# Supabase CLI
npm install -g supabase
supabase --version
```

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/devverse.git
cd devverse
```

## 2. Cài dependencies

```bash
# Node.js (root workspace)
npm install

# Python backend (nếu dùng FastAPI)
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Setup Environment Variables

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Điền các giá trị vào `.env` (xem [environment-setup.md](./environment-setup.md) để biết chi tiết):

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
JUDGE0_URL=https://your-judge0.railway.app
JUDGE0_AUTH=your_secret_token
REDIS_URL=redis://localhost:6379
```

## 4. Setup Supabase Local Dev

```bash
# Init Supabase local (lần đầu)
supabase init

# Link đến cloud project
supabase link --project-ref YOUR_PROJECT_REF

# Start local Supabase (PostgreSQL + Studio)
supabase start

# Apply migrations
supabase db reset
```

Sau khi `supabase start`, truy cập Supabase Studio tại: http://localhost:54323

## 5. Bật pgvector Extension

Trong Supabase Dashboard → Database → Extensions → Bật **vector**

Hoặc qua SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 6. Chạy Development Server

```bash
# Frontend
cd apps/web && npm run dev     # http://localhost:3000

# Backend (Node.js)
cd apps/api && npm run dev     # http://localhost:3001

# Backend (Python FastAPI)
cd apps/api && uvicorn app.main:app --reload --port 3001

# Judge0 (local Docker - optional)
cd infra/judge0 && docker compose up
```

## 7. Chạy Tests

```bash
# Tất cả (từ root)
npm test

# Backend Python
cd apps/api && pytest --cov=app --cov-report=term

# Frontend
cd apps/web && npm run test
```

## 8. Verify Setup

```bash
# API health check
curl http://localhost:3001/health
# → {"status": "ok"}

# Judge0 health (nếu chạy local)
curl http://localhost:2358/system_info
```

---

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `supabase start` fail | Docker chưa chạy | Mở Docker Desktop |
| `401 Unauthorized` | Token sai hoặc hết hạn | Check SUPABASE_ANON_KEY |
| `permission denied` (Supabase) | RLS block | Check policy cho table đó |
| Judge0 timeout | Service sleep (Railway free tier) | Wait 30s rồi retry |
| pgvector not found | Extension chưa bật | `CREATE EXTENSION vector;` |

---

## Next Steps

- Đọc [tech-stack.md](./tech-stack.md) để hiểu kiến trúc tổng quan
- Đọc [database-guide.md](./database-guide.md) trước khi làm việc với DB
- Đọc [agents/how-to-use-skills.md](../agents/how-to-use-skills.md) để dùng AI agent skills
