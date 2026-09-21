# LurnKode — Docs Index

> **CO3103 · HK261** | LMS + RAG AI Tutor + Automated Code Assessment

---

## 📖 Guides — Hướng dẫn phát triển

| File | Mô tả | Status |
|---|---|---|
| [tech-stack.md](./guides/tech-stack.md) | Kiến trúc tổng quan, stack decisions, LLM options | ✅ Cập nhật |
| [getting-started.md](./guides/getting-started.md) | Setup môi trường dev từ đầu | ✅ Cập nhật |
| [environment-setup.md](./guides/environment-setup.md) | Cấu hình `.env` mọi môi trường | ✅ Cập nhật |

---

## 🤖 Agents — AI Agent System

| File | Mô tả |
|---|---|
| [agents-overview.md](./agents/agents-overview.md) | Tổng quan hệ thống `.agents/` |
| [how-to-use-skills.md](./agents/how-to-use-skills.md) | Cách sử dụng skills trong Antigravity IDE |
| [skill-reference.md](./agents/skill-reference.md) | Danh sách đầy đủ skills + khi nào dùng |

---

## 🏗️ Tech Stack (đã xác nhận)

| Layer | Technology |
|---|---|
| **Frontend** | **Next.js + TypeScript** (App Router) |
| **Backend** | **Bun + ElysiaJS** (TypeScript) |
| **API** | REST API |
| **Database** | PostgreSQL + Drizzle ORM |
| **Vector Search** | pgvector (trong PostgreSQL) |
| **Queue / Cache** | Redis |
| **AI** | LLM + Embeddings + RAG (course-grounded) |
| **Code Execution** | Judge Worker → Docker Sandbox |
| **CI/CD** | GitHub Actions · Feature branch workflow |

> Xem chi tiết tại [`tech-stack.md`](./guides/tech-stack.md)

---

## 🎯 Functional Modules (MVP)

### Learning Management
- Auth & RBAC (Learner / Instructor / Admin)
- Course → Chapter → Lesson → Material
- Enrollment & Learning Progress
- Discussions, Notifications, Audit Log

### Assessment
- MCQ (Multiple Choice Questions)
- Programming Exercises với Automated Judging
- Auto grading + Instructor review
- Attempt History & Learner Results

### Administration
- User management, Course management
- Basic reporting, Learner monitoring
- Integrity Event review

### AI Tutor (RAG)
- Retrieval-Augmented Generation từ học liệu khóa học đã published
- Citation bắt buộc (Course / Chapter / Lesson / Material)
- Out-of-scope handling — không hallucinate
- User feedback (helpful/unhelpful)

### Code Judge
- Submission Queue (Redis) → Judge Worker → Docker Sandbox
- Resource limits: 1 CPU core, 128MB RAM, 3s Timeout
- Results: AC / WA / TLE / RTE

### ⚠️ Out of MVP Scope
- Payment processing
- Live streaming

---

## ✅ Quality Gates

| Gate | Target |
|---|---|
| Test coverage | ≥ 80% (enforced trong CI) |
| Code review | Bắt buộc trước merge |
| Secrets | `.env` không commit — dùng GitHub Secrets |
| RLS | Tất cả PostgreSQL tables có Row Level Security |
| CORS | Origin whitelist — không dùng `*` production |

---

## 📅 Sprint Timeline

| Tuần | Focus |
|---|---|
| 39–40 | Architecture, DB schema, API contracts |
| 41–43 | Core LMS (Auth, Course, Enrollment, Progress) |
| 44 | Assessment (Question bank, exam, grading) |
| 45–46 | RAG AI Tutor (indexing, retrieval, citation) |
| 47 | Integrity monitoring, auto grading, submissions |
| 48–49 | Integration, testing, benchmark, demo |
