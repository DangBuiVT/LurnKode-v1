---
name: cors-strict
description: Hướng dẫn cấu hình CORS strict và prevent API key leakage cho DevVerse. Bao gồm CORS config cho Node.js/FastAPI, environment variable best practices, và security headers.
---

# CORS & Security Headers Skill — DevVerse

## 1. CORS Configuration

### Node.js / Express

```typescript
import cors from 'cors'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// Development fallback
const isDev = process.env.NODE_ENV === 'development'

app.use(cors({
  origin: isDev
    ? ['http://localhost:3000', 'http://localhost:5173']
    : ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400  // 24h preflight cache
}))
```

### FastAPI (Python)

```python
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if not DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

## 2. No API Key Leakage

```typescript
// ❌ NEVER expose server-side keys to client
const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// SERVICE_ROLE_KEY chỉ dùng server-side

// ✅ Client-side chỉ dùng ANON_KEY
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// ✅ Prefix NEXT_PUBLIC_ chỉ cho keys được phép expose
// process.env.NEXT_PUBLIC_* → exposed to browser
// process.env.SECRET_KEY → server only
```

## 3. .env Security

```bash
# .env.example (commit vào git)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
JUDGE0_URL=https://judge0.railway.app
ALLOWED_ORIGINS=https://devverse.vercel.app

# .env (KHÔNG commit vào git)
# Thêm vào .gitignore: .env, .env.local, .env.production
```

```gitignore
# .gitignore
.env
.env.local
.env.*.local
.env.production
*.pem
*.key
```

## 4. Security Headers

```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // adjust for your needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}))
```

## 5. Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Sanitize HTML content từ user (rich text editor)
function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: []
  })
}
```

## Khi nào activate skill này

- Setup CORS cho new API server
- Debug CORS errors in browser
- Security audit trước khi deploy
- Add new frontend domain vào whitelist
- Review environment variables security
