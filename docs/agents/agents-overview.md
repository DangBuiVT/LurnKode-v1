# Agent Skills Overview — DevVerse

> Hướng dẫn tổng quan về hệ thống `.agents/` trong DevVerse.

---

## `.agents/` là gì?

`.agents/` là hệ thống AI coding assistant được cấu hình cho DevVerse.
Khi dùng **Antigravity IDE**, AI sẽ tự động đọc các file này để:
- Hiểu project context (rules, architecture)
- Dùng đúng patterns cho DevVerse (Supabase, Judge0, pgvector...)
- Route đến đúng specialist skill khi cần

```
d:\DevVerse\.agents\
├── skills/        ← Specialist knowledge (101 skills)
├── agents/        ← AI persona definitions (10 agents)
├── rules/         ← Project rules (8 domains)
└── skill-manifest.md ← Audit trail
```

---

## Cấu trúc Skills

### 11 Skill Domains

| Domain | Skills | Mục đích |
|---|---|---|
| `core/` | 21 skills | Harness (superpowers) + mattpocock engineering workflow |
| `ai/` | 12 skills | RAG pipeline, LangChain, RAGAS evaluation |
| `frontend/` | 12 skills | React, Next.js, Vercel, UI design |
| `ui-ux/` | 6 skills | Design system, brand, UI styling |
| `backend/` | 8 skills | FastAPI, ElysiaJS, API design |
| `database/` | 3 skills | Supabase, pgvector, Redis queue |
| `lms/` | 7 skills | Judge0, AST plagiarism, RBAC, quiz, progress |
| `cicd/` | 9 skills | GitHub Actions, deployment strategies |
| `infra/` | 11 skills | Judge0 deploy, monorepo, observability |
| `security/` | 5 skills | RLS, CORS, secrets management |
| `testing/` | 7 skills | Coverage 80%, E2E, unit, integration |

### Skill Tiers

```
Tier A (Vendor - Official):
  obra/superpowers         → core/ harness
  anthropics/skills        → frontend-design, skill-creator...
  vercel-labs/agent-skills → react-best-practices, deploy-to-vercel...
  mattpocock/skills        → code-review, domain-modeling, tdd...

Tier B (Specialist Vendor):
  nextlevelbuilder/ui-ux-pro-max-skill → ui-ux/ skills
  arjunprabhulal/devops-skills         → cicd/, infra/ skills
  langchain-ai/langchain-skills        → ai/ LangChain skills

Tier C (Custom - DevVerse specific):
  database/supabase, database/pgvector, database/redis-queue
  ai/rag-pgvector, ai/ragas-eval, ai/rag-citation
  lms/judge0-integration, lms/ast-plagiarism, lms/sandbox-security
  lms/rbac-lms, lms/course-hierarchy, lms/quiz-engine, lms/progress-tracking
  testing/coverage-80, security/supabase-rls, security/cors-strict
  infra/judge0-deploy, infra/monorepo-structure
  backend/fastapi, backend/elysiajs
```

---

## 10 Agent Personas

| Agent | Vai trò |
|---|---|
| `architect` | System design, ADR, module boundaries |
| `planner` | Feature decomposition, task sequencing |
| `frontend-engineer` | React/Next.js, UI, Supabase client |
| `backend-engineer` | API, business logic, Judge0 integration |
| `database-engineer` | Supabase schema, pgvector, RLS |
| `test-engineer` | Tests, >=80% coverage, CI gate |
| `devops-engineer` | GitHub Actions, Judge0 deploy, monitoring |
| `security-reviewer` | CORS, RLS, sandbox security, key management |
| `code-reviewer` | Code quality, TypeScript, best practices |
| `skill-router` | Auto-route tasks đến đúng skills |

---

## 8 Project Rules

| Rule file | Scope |
|---|---|
| `architecture.md` | Monorepo layout, module boundaries, ADR template |
| `backend.md` | API conventions, error handling, validation |
| `frontend.md` | Component structure, state management, a11y |
| `database.md` | Supabase RLS, migration workflow, naming |
| `testing.md` | >=80% coverage gate, test pyramid |
| `security.md` | No injection, CORS strict, no key leaks |
| `cicd.md` | GitHub Actions, branch strategy, release |
| `lms-domain.md` | LMS business rules, judge safety, anti-cheat ethics |

---

## Skill Manifest

File [`skill-manifest.md`](../../.agents/skill-manifest.md) ghi lại:
- Source repo + commit hash cho mọi vendor skill
- Lý do cài đặt từng skill
- Hướng dẫn update khi cần
