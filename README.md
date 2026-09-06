# DevVerse — Evidence-Based LMS

> **CO3103 · HK261** | Môn: Cloud Programming  
> **Nhóm 6 thành viên** | Timeline: Tuần 39–49

**DevVerse** là một Learning Management System (LMS) tích hợp hai thành phần AI nâng cao:

- 🤖 **AI Tutor có căn cứ (RAG)** — trả lời dựa trên học liệu khóa học, trích nguồn rõ ràng
- 🛡️ **Đánh giá tự động & Liêm chính học thuật** — chấm bài, random đề, phát hiện bất thường

---

## 🏗️ Architecture Overview

```
Browser / Mobile Web
        │ HTTPS
        ▼
┌─────────────────────────────────┐
│  Frontend (Next.js App Router)  │ ← TBD (Next.js được đề xuất)
│  TypeScript · Vercel/Netlify    │
└────────────────┬────────────────┘
                 │ REST API · JWT
                 ▼
┌─────────────────────────────────┐
│  Backend API (Bun + ElysiaJS)   │ ← ĐÃ CHỐT
│  TypeScript · Docker · Railway  │
└────┬──────────┬─────────────────┘
     │          │          │
     ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌──────────────────┐
│ Supabase │ │ Redis  │ │    Judge0         │
│ Postgres │ │ BullMQ │ │ (Code Execution) │
│ pgvector │ │ Cache  │ │ Self-hosted       │
│ Auth     │ └────────┘ └──────────────────┘
│ Storage  │
└──────────┘
     │
     ▼
┌──────────────────────────────────┐
│  RAG / AI Layer                  │
│  Embed → pgvector → LLM API      │
│  (Gemini Flash / GPT-4o-mini)    │
└──────────────────────────────────┘
```

---

## 🧱 Tech Stack

### Đã xác nhận ✅

| Layer | Technology | Ghi chú |
|---|---|---|
| **Backend** | Bun + ElysiaJS (TypeScript) | Eden type sharing giữa FE–BE |
| **Database** | Supabase (PostgreSQL) | Auth, RLS, Storage built-in |
| **Vector DB** | pgvector (trong Supabase) | HNSW index, cosine similarity |
| **Queue** | Redis + BullMQ | Judge0 submission queue |
| **Code Judge** | Judge0 (self-hosted Docker) | 60+ ngôn ngữ, Apache 2.0 |
| **CI/CD** | GitHub Actions | Feature branch → PR → merge |
| **Anti-cheat** | AST structural detection | Jaccard similarity, ≥85% flag |
| **RAG eval** | RAGAS framework | Faithfulness + Answer Relevancy |
| **Repo** | Monorepo | `apps/web`, `apps/api`, `infra/` |
| **Git** | Feature branch workflow | 1 branch/feature, CI trước merge |

### Chưa chốt ⏳

| Layer | Options | Ghi chú |
|---|---|---|
| **Frontend** | Next.js App Router *(đề xuất)* vs React+Vite | Next.js phù hợp hơn cho LMS (SSR, routing) |
| **Frontend hosting** | Vercel vs Netlify | Quyết định khi deploy lần đầu |
| **LLM Provider** | `gemini-3.8-flash` vs `gpt-4o-mini` | Xem [`tech-stack.md`](./docs/guides/tech-stack.md) |
| **Backend deploy** | Docker local → Railway | Local trước, Railway cho production |

---

## 🎯 Functional Scope

### Core LMS

| Module | Mô tả |
|---|---|
| **Auth & RBAC** | Student / Instructor / Admin, Supabase Auth + JWT |
| **Course Management** | Tạo/sửa/xuất bản, chapter → lesson → material |
| **Enrollment & Progress** | Enroll, mark completed, resume, % tiến độ |
| **Assessment** | Question bank, quiz, deadline, auto/manual grading |
| **Interaction** | Discussion, Q&A, notifications |
| **Administration** | User/course management, audit log, analytics |

### Advanced Component 1 — RAG AI Tutor

```
Student Question
    ↓ Embed (text-embedding model)
pgvector cosine search → top-5 chunks
    ↓
Out-of-scope check (threshold 0.55)
    ↓
LLM generation (Gemini Flash / GPT-4o-mini)
    ↓
Answer + Citations (Course / Lesson / Material)
```

- Câu hỏi ngoài phạm vi → **không hallucinate**, trả về thông báo rõ ràng
- Mỗi câu trả lời phải kèm **citation** đủ để học viên quay lại bài học
- Học viên có thể feedback → lưu để eval

**Evaluation**: RAGAS (Faithfulness ≥ 0.8, Answer Relevancy ≥ 0.7) vs Vanilla LLM baseline

### Advanced Component 2 — Assessment & Academic Integrity

```
Question Bank → Exam Blueprint → Randomized Exam → Attempt
    ↓
Auto Grading (objective) / Instructor Review (subjective)
    ↓
Integrity Detection (parallel):
Code → AST parse → normalize → Jaccard similarity
    → Flag if ≥ 85% → plagiarism_reports → Instructor review
```

- Attempt states: `NOT_STARTED → IN_PROGRESS → SUBMITTED / EXPIRED → GRADED`
- Integrity flag là **cảnh báo cho Instructor** — không tự kết luận gian lận

---

## 📊 Data Model (High-Level)

```
User
 ├── Enrollment ──── Course
 │                     ├── Chapter → Lesson → Material
 │                     ├── QuestionBank → Question
 │                     └── Assessment → Attempt → Submission
 ├── AIConversation → AIMessage → Citation
 ├── Notification
 └── AuditLog
```

---

## 📅 Timeline (Tuần 39–49)

| Tuần | Nội dung |
|---|---|
| **39** | Requirements, proposal, kiến trúc |
| **40** | Database schema, API contracts, UI/UX spec |
| **41** | Auth, RBAC, user management |
| **42** | Course, chapter, lesson, material |
| **43** | Enrollment, learning progress, learning flow |
| **44** | Question bank, assessment, submission |
| **45** | RAG pipeline, document processing, indexing |
| **46** | AI Assistant, citation, out-of-scope handling |
| **47** | Random exam, auto grading, integrity detection |
| **48** | Integration, testing, evaluation, bug fixing |
| **49** | Benchmark, documentation, demo, final report |

**Priority order**: Core LMS → Assessment → RAG AI → Integrity → Integration & Eval

---

## 👥 Team (6 thành viên)

| Vai trò | Trách nhiệm |
|---|---|
| **Tech Lead / Backend / Security** | Architecture, API design, Auth, RBAC, Security |
| **Course & Learning** | Course management, enrollment, progress, learning flow |
| **Assessment** | Question bank, exam generation, submission, grading |
| **AI / RAG** | Chunking, embeddings, retrieval, LLM, citation, eval |
| **Frontend / UX** | Student/Instructor UI, AI chat, dashboard, responsive |
| **Integrity / QA / DevOps** | Anti-cheat, audit log, testing, CI/CD, deployment |

---

## ⚡ Performance Targets

| Metric | Target |
|---|---|
| API response (p95) | < 500ms |
| Code execution (Judge0) | < 2s |
| RAG query latency | < 3s |
| Frontend LCP | < 2.5s |
| Test coverage | ≥ 80% |

---

## ✅ Quality Gates

- **Test coverage ≥ 80%** — enforced trong GitHub Actions CI
- **Code review** bắt buộc trước khi merge (feature branch workflow)
- **No secrets in git** — `.env` không commit, dùng GitHub Secrets
- **RLS trên tất cả tables** — Supabase Row Level Security
- **CORS strict** — origin whitelist, không dùng `*` ở production

---

## 📁 Docs

| File | Mô tả |
|---|---|
| [`docs/guides/tech-stack.md`](./docs/guides/tech-stack.md) | Kiến trúc chi tiết, stack decisions, LLM options |
| [`docs/guides/getting-started.md`](./docs/guides/getting-started.md) | Setup môi trường dev từ đầu |
| [`docs/guides/environment-setup.md`](./docs/guides/environment-setup.md) | Cấu hình `.env` cho mọi môi trường |
| [`docs/README.md`](./docs/README.md) | Mục lục đầy đủ docs |
| [`.agents/skill-manifest.md`](./.agents/skill-manifest.md) | Danh sách skills AI agent + maintenance |

---

## ⚠️ Known Risks

| Risk | Mitigation |
|---|---|
| AI hallucination | RAG + retrieval threshold + citation bắt buộc + out-of-scope handler |
| Grading sai | Instructor override + human review |
| False positive integrity flag | Warning only, không tự kết luận; instructor review evidence |
| Scope quá lớn cho 6 người | Prioritize Must-Have trước; Advanced features sau |
| LLM cost / latency | Cache embedding, pre-index, top-k retrieval, avoid unnecessary LLM calls |
