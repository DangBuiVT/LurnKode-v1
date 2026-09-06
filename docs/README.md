# DevVerse — Docs Index

> **CO3103 · HK261** | LMS + RAG AI Tutor + Assessment & Academic Integrity

---

## 📖 Guides — Hướng dẫn phát triển

| File | Mô tả | Status |
|---|---|---|
| [tech-stack.md](./guides/tech-stack.md) | Kiến trúc tổng quan, stack decisions, LLM options | ✅ Cập nhật |
| [getting-started.md](./guides/getting-started.md) | Setup môi trường dev từ đầu | ⚠️ Cần update cho Bun |
| [environment-setup.md](./guides/environment-setup.md) | Cấu hình `.env` mọi môi trường | ⚠️ Cần update LLM key |

---

## 🤖 Agents — AI Agent System

| File | Mô tả |
|---|---|
| [agents-overview.md](./agents/agents-overview.md) | Tổng quan hệ thống `.agents/` |
| [how-to-use-skills.md](./agents/how-to-use-skills.md) | Cách sử dụng skills trong Antigravity IDE |
| [skill-reference.md](./agents/skill-reference.md) | Danh sách đầy đủ skills + khi nào dùng |

---

## 🏗️ Tech Stack (tóm tắt)

### Đã chốt ✅

| Layer | Technology |
|---|---|
| Backend | **Bun + ElysiaJS** (TypeScript) |
| Database | Supabase (PostgreSQL + pgvector + Auth) |
| Queue | Redis + BullMQ |
| Code Judge | Judge0 (self-hosted Docker) |
| CI/CD | GitHub Actions · Feature branch workflow |
| Anti-cheat | AST structural detection (Jaccard ≥ 85%) |
| RAG eval | RAGAS (Faithfulness + Answer Relevancy) |

### Chưa chốt ⏳

| Layer | Options |
|---|---|
| Frontend | Next.js App Router *(đề xuất)* vs React+Vite |
| LLM Provider | `gemini-3.8-flash` vs `gpt-4o-mini` |
| Backend deploy | Docker local → Railway |

> Xem chi tiết tại [`tech-stack.md`](./guides/tech-stack.md)

---

## 🎯 Functional Modules

### Core LMS
- Auth & RBAC (Student / Instructor / Admin)
- Course → Chapter → Lesson → Material
- Enrollment & Learning Progress
- Assessment (quiz, assignment, auto/manual grading)
- Discussion, Notifications, Audit Log

### Advanced Component 1 — RAG AI Tutor
- Retrieval-Augmented Generation từ học liệu khóa học
- Citation bắt buộc (Course / Lesson / Material)
- Out-of-scope handling — không hallucinate
- User feedback + RAGAS evaluation

### Advanced Component 2 — Assessment & Academic Integrity
- Question bank + randomized exam generation
- Auto grading + rubric/instructor review
- AST-based plagiarism detection → warning cho instructor
- Attempt state machine: `NOT_STARTED → IN_PROGRESS → SUBMITTED/EXPIRED → GRADED`

---

## ✅ Quality Gates

| Gate | Target |
|---|---|
| Test coverage | ≥ 80% (enforced trong CI) |
| Code review | Bắt buộc trước merge |
| Secrets | `.env` không commit — dùng GitHub Secrets |
| RLS | Tất cả Supabase tables có Row Level Security |
| CORS | Origin whitelist — không dùng `*` production |

---

## 📅 Sprint Timeline

| Tuần | Focus |
|---|---|
| 39–40 | Architecture, DB schema, API contracts |
| 41–43 | Core LMS (Auth, Course, Enrollment, Progress) |
| 44 | Assessment (Question bank, exam, grading) |
| 45–46 | RAG AI Tutor (indexing, retrieval, citation) |
| 47 | Integrity detection, random exam, auto grading |
| 48–49 | Integration, testing, benchmark, demo |
