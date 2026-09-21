# Tech Stack & Architecture — LurnKode

> Tổng quan kiến trúc hệ thống và các lựa chọn công nghệ chính thức.

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
│     Next.js + TypeScript (App Router)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JWT)
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND API                            │
│         Bun + ElysiaJS (TypeScript)                     │
└──────┬──────────┬────────────┬───────────────────────────┘
       │          │            │
       ▼          ▼            ▼
┌──────────────┐ ┌──────────┐ ┌───────────────────────────┐
│ PostgreSQL   │ │  Redis   │ │       RAG Service         │
│ + pgvector   │ │  Cache   │ │  Embed → Retrieve → LLM   │
│ (Drizzle ORM)│ │  Queue   │ └───────────────────────────┘
└──────────────┘ └────┬─────┘
                      │ Submission Queue
                      ▼
               ┌──────────────┐
               │ Judge Worker │
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────────┐
               │  Docker Sandbox  │
               │ 1 CPU · 128MB    │
               │ Timeout: 3s      │
               └──────────────────┘
```

---

## Tech Stack (đã xác nhận)

| Layer | Technology | Ghi chú |
|---|---|---|
| **Frontend** | **Next.js + TypeScript** | App Router, SSR ✅ |
| **Backend** | **Bun + ElysiaJS** | TypeScript full-stack, Eden type sharing ✅ |
| **API** | **REST API** | Primary FE–BE integration ✅ |
| **Database** | **PostgreSQL** | Primary relational data store ✅ |
| **ORM** | **Drizzle ORM** | Type-safe schema + migrations ✅ |
| **Vector Search** | **pgvector** | HNSW index, cosine similarity ✅ |
| **Cache / Queue** | **Redis** | Cache + submission queue ✅ |
| **AI** | **LLM + Embeddings + RAG** | Course-grounded evidence-based tutor ✅ |
| **Code Execution** | **Docker Sandbox** | Isolated, resource-limited ✅ |
| **CI/CD** | **GitHub Actions** | Feature branch → PR → merge ✅ |

### Chưa quyết định

| Component | Options | Ghi chú |
|---|---|---|
| **LLM Provider** | Gemini API vs OpenAI GPT-4o-mini | Xem bảng so sánh bên dưới |
| **PostgreSQL hosting** | Self-hosted / Supabase managed / other | Quyết định khi deploy — không ảnh hưởng đến tech stack |
| **Judge Worker implementation** | Judge0 (Docker-based) hoặc custom | Judge0 là candidate vì đã có Docker + Redis sẵn |

### LLM Provider — Đang cân nhắc

| Provider | Model | Embedding | Free tier | Note |
|---|---|---|---|---|
| **Google Gemini** | `gemini-2.5-flash` (stable) | `text-embedding-004` | Rộng (AI Studio) | Kiểm tra quota tại [aistudio.google.com](https://aistudio.google.com) |
| **OpenAI** | `gpt-4o-mini` | `text-embedding-3-small` | Hạn chế | $5 credit khi đăng ký |

> ⚠️ **Lưu ý**: Luôn pin version cụ thể trong `.env` và kiểm tra free tier quota trước khi commit.

---

## Data Model (High-Level)

```
Learning Domain:
User
 └── Enrollment
       └── Course
             └── Chapter
                   └── Lesson
                         └── Material
                               └── RAGSource (pgvector embeddings)

Assessment Domain:
Course
 └── Assessment
       └── AssessmentItem (MCQ | Programming)

User
 └── Attempt
       └── Answer
       └── CodeSubmission
             └── TestResult

AI / Operations:
User
 └── AIConversation
       └── AIMessage
             └── Citation

User └── Notification
User / Admin └── AuditLog
```

---

## Service Communication

```
Frontend → Backend API   : REST over HTTPS (JWT auth)
Backend → PostgreSQL     : Drizzle ORM (server-side)
Backend → Redis          : Submission queue + cache
Backend → RAG Service    : Embed + retrieve + LLM generation
Backend → Judge Worker   : Enqueue submission via Redis
Judge Worker → Sandbox   : Execute code in Docker (isolated)
Sandbox → Judge Worker   : Return result (AC/WA/TLE/RTE)
Judge Worker → DB        : Update submission status
```

---

## Security Architecture

```
Request
  → CORS check (allowed origins whitelist)
  → Auth middleware (JWT verify)
  → RBAC check (role from PostgreSQL users table)
  → Business logic
  → Database (PostgreSQL RLS double-check)
  → Response
```

---

## Component: RAG AI Tutor

```
Published Course Material (Markdown/Video transcript)
    ↓ Ingestion pipeline
Chunking (512 tokens, 50 overlap)
    ↓
Embedding model → pgvector (HNSW index, cosine similarity)
    ↓ Query time
User question → embed → cosine search → top-5 chunks
    ↓
Out-of-scope check (threshold 0.55)
    ↓
LLM generation với context + citations
    ↓
Response: answer + citations (Chapter/Lesson/Material source)

Evaluation metrics:
- Recall@K, Precision@K
- Answer Relevance, Grounding
- Citation Correctness
- Out-of-scope Rejection Accuracy
- User Feedback (helpful/unhelpful)
```

---

## Component: Automated Code Assessment (Judge Worker + Docker Sandbox)

```
Learner submits code
    ↓ Validation (size ≤ 64KB, language whitelist)
POST /api/submissions → enqueue (Redis)
    ↓ Judge Worker picks up job
Docker Sandbox execution (isolated container)
    ↓ Run against hidden tests
    Resource limits: 1 CPU core · 128MB RAM · 3s Timeout
Result: AC / WA / TLE / RTE
    ↓ Sanitize output (stdout ≤ 4KB, stderr ≤ 1KB)
Store in PostgreSQL → notify frontend

Note: Integrity events logged for Instructor review
      (không tự kết luận gian lận)
```

---

## Performance Targets

| Metric | Target |
|---|---|
| API response (p95) | < 500ms |
| Code execution (Docker Sandbox) | < 3 seconds |
| RAG query latency | < 3 seconds |
| Frontend LCP | < 2.5 seconds |
| Test coverage | >= 80% |
