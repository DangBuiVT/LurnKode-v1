# DevVerse Documentation

> **CO3103 — HK261** | Cloud Programming Academy (LeetCode-like LMS)

---

## 📚 Mục lục

### Guides — Hướng dẫn phát triển
| File | Mô tả |
|---|---|
| [getting-started.md](./guides/getting-started.md) | Setup môi trường dev từ đầu |
| [tech-stack.md](./guides/tech-stack.md) | Tổng quan kiến trúc và tech stack |
| [architecture-decisions.md](./guides/architecture-decisions.md) | Các quyết định kiến trúc và lý do |
| [environment-setup.md](./guides/environment-setup.md) | Cấu hình biến môi trường |
| [database-guide.md](./guides/database-guide.md) | Schema, migrations, RLS workflow |
| [testing-guide.md](./guides/testing-guide.md) | Hướng dẫn viết tests đạt >=80% |
| [deployment-guide.md](./guides/deployment-guide.md) | Deploy lên Vercel + Railway/Render |

### Agents — AI Agent System
| File | Mô tả |
|---|---|
| [agents-overview.md](./agents/agents-overview.md) | Tổng quan hệ thống `.agents/` |
| [how-to-use-skills.md](./agents/how-to-use-skills.md) | Cách sử dụng skills trong Antigravity |
| [skill-reference.md](./agents/skill-reference.md) | Danh sách đầy đủ skills + khi nào dùng |

---

## 🏗️ Project Overview

| Thành phần | Stack | Hosting |
|---|---|---|
| Frontend | TBD (Next.js / React) | Vercel / Netlify |
| Backend API | TBD (FastAPI / Bun+Elysia) | Railway / Render |
| Database | Supabase (PostgreSQL + pgvector) | Supabase Cloud |
| Code Judge | Judge0 (self-hosted) | Railway / Render |
| Queue | Redis + BullMQ / Celery | Railway |
| CI/CD | GitHub Actions | GitHub |

## 🎯 Mandatory Components (CO3103)

### Core LMS
- RBAC: Student / Instructor / Admin
- Course hierarchy (Module → Lesson)
- Video + Slide content delivery
- Enrollment & Progress tracking
- Quizzes & Assignments (auto/manual grading)

### Advanced 5.1 — RAG AI Tutor
- Vector DB: **pgvector** (trong Supabase, free tier)
- Sources: course slides + video transcripts
- Citations: exact lesson/slide source bắt buộc
- Evaluation: **RAGAS** (Faithfulness + Answer Relevance vs Vanilla LLM)

### Advanced 5.4 — Sandbox + Anti-cheat
- Sandbox: **Judge0** (Docker, CPU/RAM limits, Redis queue)
- Anti-cheat: **AST structural plagiarism detection**
- Execution latency target: **< 2 seconds**
- Evaluation: AST recall rate vs String Matching baseline

## ✅ Quality Gates

- Test coverage: **>= 80%** (enforced in CI)
- Code review required trước khi merge
- No API key leaks (`.env` không commit)
- Security: CORS strict + RLS trên tất cả tables
