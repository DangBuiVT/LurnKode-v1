# Environment Setup — DevVerse

> Hướng dẫn cấu hình environment variables cho mọi môi trường.

---

## File `.env.example` (commit vào git)

Tạo file này ở root project để team biết cần những variables nào:

```env
# ============================================
# SUPABASE
# ============================================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ⚠️ SERVICE_ROLE_KEY: server-side ONLY, KHÔNG đưa vào frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OPENAI (cho RAG AI Tutor)
# ============================================
OPENAI_API_KEY=sk-...

# ============================================
# JUDGE0 (Code Execution Sandbox)
# ============================================
JUDGE0_URL=https://your-judge0.railway.app
JUDGE0_AUTH=your_secret_token_here

# ============================================
# REDIS (Submission Queue)
# ============================================
REDIS_URL=redis://localhost:6379
# Redis Cloud / Railway Redis:
# REDIS_URL=redis://:password@host:port

# ============================================
# CORS (production)
# ============================================
ALLOWED_ORIGINS=https://devverse.vercel.app,https://devverse.netlify.app

# ============================================
# APP CONFIG
# ============================================
NODE_ENV=development
DEBUG=true
PORT=3001
```

---

## Frontend Environment Variables (Next.js)

> Chỉ variables có prefix `NEXT_PUBLIC_` mới được expose ra browser.

```env
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> ⚠️ **KHÔNG bao giờ đặt `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`**

---

## Backend Environment Variables

```env
# apps/api/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # Server-side only
OPENAI_API_KEY=sk-...
JUDGE0_URL=https://...
JUDGE0_AUTH=...
REDIS_URL=redis://...
ALLOWED_ORIGINS=http://localhost:3000
```

---

## GitHub Actions Secrets

Vào **GitHub → Settings → Secrets and variables → Actions** và thêm:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | URL của Supabase project |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `OPENAI_API_KEY` | OpenAI API key |
| `JUDGE0_URL` | Judge0 deployment URL |
| `JUDGE0_AUTH` | Judge0 auth token |
| `REDIS_URL` | Redis connection string |
| `VERCEL_TOKEN` | Vercel deploy token (nếu dùng) |

---

## Lấy Supabase Keys

1. Vào https://supabase.com/dashboard
2. Chọn project → **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (giữ bí mật!)

---

## .gitignore (bắt buộc)

Đảm bảo các file sau trong `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.production

# Secret keys
*.pem
*.key
*.p12

# Build output
dist/
.next/
__pycache__/
*.pyc
.venv/
```

---

## Security Checklist

- [ ] `.env` đã có trong `.gitignore`
- [ ] Không commit `.env` vào git (check `git status`)
- [ ] `SERVICE_ROLE_KEY` KHÔNG có trong frontend code
- [ ] GitHub Secrets đã được cấu hình
- [ ] `ALLOWED_ORIGINS` chỉ chứa domains thực sự cần thiết
