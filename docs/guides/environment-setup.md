# Environment Setup — LurnKode

> Hướng dẫn cấu hình environment variables cho mọi môi trường.  
> **Stack**: Bun + ElysiaJS · PostgreSQL + Drizzle ORM · Redis · Docker Sandbox · LLM API (TBD: Gemini / OpenAI)

---

## `.env.example` (commit vào git)

Tạo file này ở root project để team biết cần những variables nào.  
**File thật (`.env`) KHÔNG commit** — chỉ commit `.env.example`.

```env
# ============================================
# DATABASE (PostgreSQL + Drizzle ORM)
# ============================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lurnkode
# Production: postgresql://user:password@host:5432/lurnkode?sslmode=require

# ============================================
# REDIS (Submission Queue + Cache)
# ============================================
REDIS_URL=redis://localhost:6379
# Production: redis://:password@host:port

# ============================================
# LLM (RAG AI Tutor) — Chọn 1 provider
# ============================================
LLM_PROVIDER=gemini                  # hoặc: openai

# Google Gemini (free tier tại aistudio.google.com)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash        # pin version cụ thể
GEMINI_EMBEDDING_MODEL=text-embedding-004

# OpenAI (fallback / alternative)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ============================================
# JUDGE WORKER (Docker Sandbox)
# ============================================
JUDGE_WORKER_URL=http://localhost:2358          # local Docker
# JUDGE_WORKER_URL=https://your-judge.example.com  # production
JUDGE_WORKER_AUTH=your_secret_token_here
# Resource limits được cấu hình tại Judge Worker level:
# CPU: 1 core · RAM: 128MB · Timeout: 3s

# ============================================
# AUTH (JWT)
# ============================================
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRY=7d

# ============================================
# CORS (chỉ domains cụ thể — KHÔNG dùng *)
# ============================================
ALLOWED_ORIGINS=http://localhost:3000

# ============================================
# APP CONFIG
# ============================================
NODE_ENV=development
PORT=3001
```

---

## Frontend Environment Variables

> Chỉ variables có prefix `NEXT_PUBLIC_` mới được expose ra browser.  
> API keys và database credentials **tuyệt đối không** có prefix `NEXT_PUBLIC_`.

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> ⚠️ **KHÔNG BAO GIỜ** đặt `NEXT_PUBLIC_DATABASE_URL`  
> ⚠️ **KHÔNG BAO GIỜ** đặt `NEXT_PUBLIC_GEMINI_API_KEY` hoặc `NEXT_PUBLIC_OPENAI_API_KEY`  
> ⚠️ **KHÔNG BAO GIỜ** đặt `NEXT_PUBLIC_JWT_SECRET`

---

## Backend Environment Variables (Bun + ElysiaJS)

```env
# apps/api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lurnkode
REDIS_URL=redis://localhost:6379

LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
# OPENAI_API_KEY=sk-...             # uncomment nếu dùng OpenAI

JUDGE_WORKER_URL=http://localhost:2358
JUDGE_WORKER_AUTH=...

JWT_SECRET=your_jwt_secret_min_32_chars
ALLOWED_ORIGINS=http://localhost:3000
PORT=3001
NODE_ENV=development
```

---

## GitHub Actions Secrets

Vào **GitHub → Settings → Secrets and variables → Actions** và thêm:

| Secret name | Value | Ghi chú |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ⚠️ Bí mật tuyệt đối |
| `REDIS_URL` | Redis connection string | |
| `LLM_PROVIDER` | `gemini` hoặc `openai` | |
| `GEMINI_API_KEY` | Google AI Studio API key | Nếu dùng Gemini |
| `OPENAI_API_KEY` | OpenAI API key | Nếu dùng OpenAI |
| `JUDGE_WORKER_URL` | Judge Worker deployment URL | |
| `JUDGE_WORKER_AUTH` | Judge Worker auth token | |
| `JWT_SECRET` | JWT signing secret | ⚠️ Bí mật tuyệt đối |

> ℹ️ Nếu dùng Supabase làm managed PostgreSQL hosting, thêm:  
> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`  
> _(đây là implementation detail của provider, không phải tech stack chính)_

---

## Lấy API Keys

### Google Gemini API (Free tier)
1. Vào https://aistudio.google.com
2. Đăng nhập bằng Google Account
3. **Get API key** → tạo key mới
4. **Kiểm tra quota**: free tier ~1M tokens/ngày, ~15 RPM
5. ⚠️ **Không enable billing** trên Google Cloud project — sẽ mất free tier

### OpenAI (nếu dùng)
1. Vào https://platform.openai.com/api-keys
2. Create new secret key
3. Free credit: $5 khi đăng ký mới

---

## `.gitignore` (bắt buộc)

Đảm bảo các file sau trong `.gitignore`:

```gitignore
# Environment files — KHÔNG commit
.env
.env.local
.env.*.local
.env.development
.env.production

# Bun
node_modules/
bun.lockb       # có thể commit nếu muốn lock versions

# Build output
dist/
.next/
out/

# Secret keys
*.pem
*.key
*.p12

# Drizzle
drizzle/meta/  # có thể commit nếu muốn track migrations
```

---

## Security Checklist

- [ ] `.env` đã có trong `.gitignore`
- [ ] Không commit `.env` vào git (`git status` trước khi push)
- [ ] `DATABASE_URL` **không có trong** frontend code hoặc bundle
- [ ] LLM API key **không có prefix `NEXT_PUBLIC_`**
- [ ] `JWT_SECRET` **không bị log** trong backend console
- [ ] `JUDGE_WORKER_AUTH` token **không bị log**
- [ ] GitHub Secrets đã được cấu hình đầy đủ
- [ ] `ALLOWED_ORIGINS` chỉ chứa domains thực sự cần thiết (không dùng `*`)

## M1 — Auth Service

M1 có hướng dẫn setup riêng tại [docs/api/m1/environment-setup.md](../api/m1/environment-setup.md). M1 dùng database riêng và JWT RS256/JWKS; không cần Redis, LLM hay Judge Worker. Hướng dẫn tổng quát hiện tại trong file này còn chứa cấu hình cho các module khác; không sao chép các biến đó vào môi trường M1.


