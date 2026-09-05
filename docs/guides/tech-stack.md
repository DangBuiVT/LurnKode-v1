# Tech Stack & Architecture — DevVerse

> Tổng quan kiến trúc hệ thống và các lựa chọn công nghệ.

---

## Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                             │
│          Browser / Mobile Web                           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                   FRONTEND                              │
│     Next.js / React   →   Vercel / Netlify              │
│     (TBD when team decides)                             │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND API                            │
│  FastAPI (Python) / Bun + ElysiaJS  →  Railway/Render  │
│  (TBD when team decides)                                │
└──────┬──────────┬────────────┬───────────────────────────┘
       │          │            │
       ▼          ▼            ▼
┌──────────┐ ┌────────┐ ┌──────────────────┐
│ Supabase │ │ Redis  │ │   Judge0         │
│ Postgres │ │ Queue  │ │ (Code Execution) │
│ pgvector │ │ Cache  │ │ Railway/Render   │
│ Auth     │ │        │ └──────────────────┘
│ Storage  │ └────────┘
└──────────┘
```

---

## Lựa chọn đã xác nhận (Fixed)

| Component | Technology | Lý do |
|---|---|---|
| **Database** | Supabase (PostgreSQL) | Free tier, Auth built-in, managed |
| **Vector DB** | pgvector (trong Supabase) | Zero cost thêm, không cần service riêng |
| **Code Judge** | Judge0 (self-hosted) | Apache 2.0 free, Docker, Redis sẵn, 60+ ngôn ngữ |
| **CI/CD** | GitHub Actions | Free cho student, ecosystem tốt |
| **Repo structure** | Monorepo | Dễ chia sẻ trong nhóm |
| **Anti-cheat** | AST structural detection | Yêu cầu đề bài 5.4 |
| **RAG eval** | RAGAS framework | Yêu cầu đề bài 5.1 |

## Chưa quyết định (TBD)

| Component | Options | Deadline quyết định |
|---|---|---|
| **Backend framework** | FastAPI (Python) vs Bun+ElysiaJS | Trước sprint 1 |
| **Frontend framework** | Next.js App Router vs React+Vite | Trước sprint 1 |
| **Frontend hosting** | Vercel vs Netlify | Khi deploy lần đầu |

---

## Database Schema Overview

```
users (Supabase Auth)
├── profiles (user_metadata: role)
├── courses
│   └── modules
│       └── lessons (video_url, slide_url)
├── enrollments (user ↔ course)
├── lesson_progress
├── quizzes
│   └── questions
│       └── attempt_answers
├── quiz_attempts
├── submissions (code judge)
├── course_chunks (pgvector embeddings)
└── plagiarism_reports
```

## Service Communication

```
Frontend → Backend API  : REST over HTTPS (JWT auth)
Backend → Supabase      : Supabase SDK (server-side, service role)
Backend → Redis         : BullMQ / Celery task queue
Backend → Judge0        : REST API (X-Auth-Token header)
Worker → Judge0         : Poll result (async)
Worker → Supabase       : Update submission status
```

## Security Architecture

```
Request
  → CORS check (allowed origins whitelist)
  → Auth middleware (Supabase JWT verify)
  → RBAC check (role from user_metadata)
  → Business logic
  → Database (RLS double-check)
  → Response
```

---

## Component 5.1: RAG AI Tutor

```
Course Content (PDF slides / Video transcripts)
    ↓ Ingestion pipeline
Chunking (512 tokens, 50 overlap)
    ↓
OpenAI text-embedding-3-small
    ↓
pgvector (HNSW index, cosine similarity)
    ↓ Query time
User question → embed → cosine search → top-5 chunks
    ↓
Out-of-scope check (threshold 0.55)
    ↓
GPT-4o-mini generation với context + citations
    ↓
Response: answer + citations (lesson/slide source)

Evaluation:
RAGAS (Faithfulness + Answer Relevance)
vs Vanilla LLM baseline
```

## Component 5.4: Sandbox + Anti-cheat

```
Student submits code
    ↓ Validation (size, language whitelist)
POST /submissions → enqueue (Redis/BullMQ)
    ↓ Worker picks up job
Judge0 API call (base64 encoded)
    ↓ Async poll
Result: status, time, memory, stdout, stderr
    ↓ Sanitize output
Store in Supabase → notify frontend

Anti-cheat (parallel):
Code → AST parse → normalize (remove var names)
    ↓
Compare with existing submissions (Jaccard similarity)
    ↓
Flag if similarity >= 85% → plagiarism_reports
Admin review → action
```

---

## Performance Targets

| Metric | Target |
|---|---|
| API response (p95) | < 500ms |
| Code execution (Judge0) | < 2 seconds |
| RAG query latency | < 3 seconds |
| Frontend LCP | < 2.5 seconds |
| Test coverage | >= 80% |
