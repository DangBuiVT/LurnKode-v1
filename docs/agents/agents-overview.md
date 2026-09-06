# Agent Skills Overview — DevVerse

> Hướng dẫn tổng quan về hệ thống `.agents/` trong DevVerse.

---

## `.agents/` là gì?

`.agents/` là hệ thống AI coding assistant được cấu hình riêng cho DevVerse.
Khi dùng **Antigravity IDE**, AI tự động đọc các file này để:
- Hiểu project context (rules, architecture, stack đã xác nhận)
- Áp dụng đúng conventions cho DevVerse (Bun+Elysia, Supabase, Judge0...)
- Route đến đúng specialist skill khi cần
- Follow đúng workflow khi build feature hoặc debug

```
d:\DevVerse\.agents\
├── skills/        ← Specialist knowledge (~74 skills, 11 domains)
├── agents/        ← AI persona definitions (10 agents)
├── rules/         ← Project rules + workflows (12 files)
└── skill-manifest.md ← Audit trail (source, commit, maintenance)
```

---

## Cấu trúc Skills (11 Domains)

| Domain | Số skills | Mục đích |
|---|---|---|
| `core/` | 21 | Superpowers harness + mattpocock engineering workflow |
| `ai/` | 12 | RAG pipeline, LangChain, RAGAS evaluation |
| `frontend/` | 12 | React, Vercel, UI design (TBD: Next.js vs Vite) |
| `ui-ux/` | 6 | Design system, brand, UI styling |
| `backend/` | 1 | **ElysiaJS** (đã chốt — FastAPI đã loại bỏ) |
| `database/` | 3 | Supabase, pgvector, Redis/BullMQ |
| `lms/` | 7 | Judge0, AST plagiarism, RBAC, quiz, progress |
| `cicd/` | 9 | GitHub Actions, deployment strategies |
| `infra/` | 11 | Judge0 deploy, monorepo, observability |
| `security/` | 5 | RLS, CORS, secrets management |
| `testing/` | 7 | Coverage 80%, E2E (Playwright), unit, integration |

### Skill Tiers

```
Tier A (Vendor — Official):
  obra/superpowers         → core/ harness (planning, tdd, debugging...)
  anthropics/skills        → frontend-design, skill-creator, mcp-builder...
  vercel-labs/agent-skills → react-best-practices, deploy-to-vercel...
  mattpocock/skills        → code-review, domain-modeling, tdd, diagnosing-bugs...

Tier B (Specialist Vendor):
  nextlevelbuilder/ui-ux-pro-max-skill → ui-ux/ skills
  arjunprabhulal/devops-skills         → cicd/, infra/ skills
  langchain-ai/langchain-skills        → ai/ LangChain skills

Tier C (Custom — DevVerse specific):
  database/supabase, database/pgvector, database/redis-queue
  ai/rag-pgvector, ai/ragas-eval, ai/rag-citation
  lms/judge0-integration, lms/ast-plagiarism, lms/sandbox-security
  lms/rbac-lms, lms/course-hierarchy, lms/quiz-engine, lms/progress-tracking
  testing/coverage-80, security/supabase-rls, security/cors-strict
  infra/judge0-deploy, infra/monorepo-structure
  backend/elysiajs   ← PRIMARY backend skill (đã chốt)
```

---

## 10 Agent Personas

| Agent | Vai trò | Skills ưu tiên |
|---|---|---|
| `architect` | System design, ADR, module boundaries | core/research, core/domain-modeling |
| `planner` | Feature decomposition, task sequencing | core/planning, core/to-tickets |
| `frontend-engineer` | React/Next.js (TBD), UI, Supabase client | react-best-practices, ui-ux-pro-max |
| `backend-engineer` | **Bun+ElysiaJS** API, Judge0, Redis | **backend/elysiajs**, rbac-lms, judge0-integration |
| `database-engineer` | Supabase schema, pgvector, RLS | database/supabase, database/pgvector, supabase-rls |
| `test-engineer` | Tests, ≥80% coverage, CI gate | testing/coverage-80, testing/webapp-testing |
| `devops-engineer` | GitHub Actions, Judge0 deploy, monitoring | cicd/ci-pipelines, infra/judge0-deploy |
| `security-reviewer` | CORS, RLS, sandbox security, key mgmt | sandbox-security, supabase-rls, cors-strict |
| `code-reviewer` | Code quality, TypeScript, best practices | core/code-review, backend/elysiajs |
| `skill-router` | Auto-route tasks → đúng skills + workflows | Đọc `agents/skill-router.md` |

---

## 12 Rules + Workflows

| File | Scope |
|---|---|
| `rules/architecture.md` | Monorepo layout, module boundaries, ADR template |
| `rules/backend.md` | Bun+ElysiaJS conventions, error handling, middleware order |
| `rules/frontend.md` | Component structure, TanStack Query, state management, a11y |
| `rules/database.md` | Supabase RLS, migration workflow, naming conventions |
| `rules/testing.md` | ≥80% coverage gate, test pyramid |
| `rules/security.md` | No injection, CORS strict, no key leaks |
| `rules/cicd.md` | GitHub Actions, feature branch strategy, release |
| `rules/lms-domain.md` | LMS business rules, judge safety, anti-cheat ethics |
| `rules/workflow-plan.md` | **6-bước workflow khi build feature mới** |
| `rules/workflow-debug.md` | **Systematic debug + 6-lớp architecture audit** |
| `rules/workflow-tdd.md` | **TDD + Architecture Debug mode (khi user nêu vấn đề)** |
| `rules/workflow-code-review.md` | **Code review toàn diện: architecture + security + suggestions** |

### Workflow Triggers

| Nói với AI | Workflow được áp dụng |
|---|---|
| "build feature X", "implement", "/plan" | `workflow-plan.md` |
| "debug", "fix bug", "tại sao lỗi" | `workflow-debug.md` + `workflow-tdd.md` (Architecture Debug mode) |
| "viết test", "tdd" | `workflow-tdd.md` (TDD mode) |
| "review code", "xem lại" | `workflow-code-review.md` |

---

## Skill Priority (Conflict Resolution)

```
.agents/rules/*.md          ← LUÔN override (project-specific)
    >
.agents/skills/lms/         ← LMS domain knowledge
    >
.agents/skills/backend/elysiajs  ← Backend conventions
    >
.agents/skills/core/        ← Vendor harness (superpowers, mattpocock)
    >
Generic AI knowledge
```

---

## Skill Manifest

File [`.agents/skill-manifest.md`](../../.agents/skill-manifest.md) ghi lại:
- Source repo + commit hash cho mọi vendor skill
- Lý do cài đặt từng custom skill
- **Tech stack decisions đã xác nhận** (06/09/2026)
- Hướng dẫn update / maintenance
