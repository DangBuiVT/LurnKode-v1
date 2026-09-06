# Environment Setup — DevVerse

> Hướng dẫn cấu hình environment variables cho mọi môi trường.
> **Stack**: Bun + ElysiaJS · Supabase · Redis · Judge0 · LLM API (TBD: Gemini / OpenAI)

---

## `.env.example` (commit vào git)

Tạo file này ở root project để team biết cần những variables nào.
**File thật (`.env`) KHÔNG commit** — chỉ commit `.env.example`.

```env
# ============================================
# SUPABASE
# ============================================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ⚠️ SERVICE_ROLE_KEY: backend server-side ONLY — KHÔNG đưa vào frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# LLM (RAG AI Tutor) — Chọn 1 provider
# ============================================
LLM_PROVIDER=gemini                  # hoặc: openai

# Google Gemini (free tier tại aistudio.google.com)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash        # pin version — kiểm tra free tier trước khi dùng

# OpenAI (fallback / alternative)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ============================================
# JUDGE0 (Code Execution Sandbox)
# ============================================
JUDGE0_URL=http://localhost:2358          # local Docker
# JUDGE0_URL=https://your-judge0.railway.app  # production Railway
JUDGE0_AUTH=your_secret_token_here

# ============================================
# REDIS (Submission Queue + Cache)
# ============================================
REDIS_URL=redis://localhost:6379
# Railway Redis: redis://:password@host:port

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
> `SERVICE_ROLE_KEY` **tuyệt đối không** có prefix `NEXT_PUBLIC_`.

```env
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> ⚠️ **KHÔNG BAO GIỜ** đặt `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`  
> ⚠️ **KHÔNG BAO GIỜ** đặt `NEXT_PUBLIC_GEMINI_API_KEY` hoặc `NEXT_PUBLIC_OPENAI_API_KEY`

---

## Backend Environment Variables (Bun + ElysiaJS)

```env
# apps/api/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...        # server-side only

LLM_PROVIDER=gemini                  # hoặc: openai
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash
# OPENAI_API_KEY=sk-...             # uncomment nếu dùng OpenAI

JUDGE0_URL=http://localhost:2358
JUDGE0_AUTH=...
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
PORT=3001
NODE_ENV=development
```

---

## GitHub Actions Secrets

Vào **GitHub → Settings → Secrets and variables → Actions** và thêm:

| Secret name | Value | Ghi chú |
|---|---|---|
| `SUPABASE_URL` | URL của Supabase project | |
| `SUPABASE_ANON_KEY` | Anon/public key | |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ⚠️ Bí mật tuyệt đối |
| `LLM_PROVIDER` | `gemini` hoặc `openai` | |
| `GEMINI_API_KEY` | Google AI Studio API key | Nếu dùng Gemini |
| `OPENAI_API_KEY` | OpenAI API key | Nếu dùng OpenAI |
| `JUDGE0_URL` | Judge0 deployment URL | |
| `JUDGE0_AUTH` | Judge0 auth token | |
| `REDIS_URL` | Redis connection string | |
| `VERCEL_TOKEN` | Vercel deploy token | Nếu deploy Vercel |

---

## Lấy API Keys

### Supabase
1. Vào https://supabase.com/dashboard
2. Chọn project → **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(giữ bí mật!)*

### Gemini API (Free tier)
1. Vào https://aistudio.google.com
2. Đăng nhập bằng Google Account
3. **Get API key** → tạo key mới
4. **Kiểm tra quota**: Projects → IAM → Quotas (free tier: ~1M tokens/ngày, ~15 RPM)
5. ⚠️ **Không enable billing** trên Google Cloud project đó — sẽ mất free tier

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

# Supabase local
.supabase/
```

---

## Security Checklist

- [ ] `.env` đã có trong `.gitignore`
- [ ] Không commit `.env` vào git (`git status` trước khi push)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **không có trong** frontend code hoặc bundle
- [ ] LLM API key (`GEMINI_API_KEY` / `OPENAI_API_KEY`) **không có prefix `NEXT_PUBLIC_`**
- [ ] `JUDGE0_AUTH` token **không bị log** trong backend console
- [ ] GitHub Secrets đã được cấu hình đầy đủ
- [ ] `ALLOWED_ORIGINS` chỉ chứa domains thực sự cần thiết (không dùng `*`)
