# Skill Reference — LurnKode

> Danh sách đầy đủ tất cả skills, khi nào dùng, và nguồn gốc.  
> ⭐ = Critical skill — phải đọc trước khi implement feature liên quan.

---

## Workflow Rules (đọc trước tiên)

| File | Trigger | Mô tả |
|---|---|---|
| `.agents/rules/workflow-plan.md` | "build feature", "implement", `/plan` | 6-bước feature planning (Context → DB → BE → FE → Test → Review) |
| `.agents/rules/workflow-debug.md` | "debug", "fix bug", "lỗi" | Systematic debug + phân loại bug theo lớp |
| `.agents/rules/workflow-tdd.md` | "viết test", "tdd", nêu vấn đề | **TDD mode** + **Architecture Debug mode** |
| `.agents/rules/workflow-code-review.md` | "review code", `/code-review` | Architecture review + Security audit toàn hệ thống |

---

## Core Skills (Harness)

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `core/planning` | obra/superpowers | Bắt đầu feature mới — tạo implementation plan |
| `core/tdd` | obra/superpowers | Viết tests trước khi code |
| `core/debugging` | obra/superpowers | Systematic debugging cho bugs khó |
| `core/verification` | obra/superpowers | Verify trước khi mark task complete |
| `core/implementation` | obra/superpowers | Subagent-driven development |
| `core/code-review` | mattpocock/skills | Review code trước khi merge |
| `core/diagnosing-bugs` | mattpocock/skills | Root cause analysis |
| `core/domain-modeling` | mattpocock/skills | Data model design |
| `core/to-tickets` | mattpocock/skills | Decompose features thành tasks |
| `core/wayfinder` | mattpocock/skills | Navigate codebase không quen |
| `core/research` | mattpocock/skills | Research trước khi implement |
| `core/prototype` | mattpocock/skills | Quick prototype để validate ý tưởng |

---

## AI / RAG Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `ai/rag-pgvector` ⭐ | Custom (LurnKode) | **Build AI Tutor RAG pipeline** — chunking, HNSW, cosine search |
| `ai/ragas-eval` ⭐ | Custom (LurnKode) | **RAG evaluation** — Recall@K, Precision@K, Grounding, Citation |
| `ai/rag-citation` ⭐ | Custom (LurnKode) | **Citation format + out-of-scope handling** (threshold 0.55) |
| `ai/langchain-rag` | langchain-ai/skills | LangChain RAG patterns tham khảo |
| `ai/langchain-fundamentals` | langchain-ai/skills | LangChain cơ bản |
| `ai/eval-engineering` | langchain-ai/skills | Evaluation engineering patterns |
| `ai/deep-agents-core` | langchain-ai/skills | Advanced agent patterns |
| `ai/claude-api` | anthropics/skills | Anthropic Claude API integration |

---

## LMS Domain Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `lms/sandbox-security` ⭐ | Custom (LurnKode) | **Security review code Judge** — resource limits, Docker isolation, injection prevention |
| `lms/judge0-integration` ⭐ | Custom (LurnKode) | **Judge Worker implementation** — Judge0 làm Docker-based execution engine, lifecycle, async |
| `lms/rbac-lms` ⭐ | Custom (LurnKode) | **Learner / Instructor / Admin RBAC** patterns |
| `lms/course-hierarchy` ⭐ | Custom (LurnKode) | **Course → Chapter → Lesson → Material** data model |
| `lms/quiz-engine` ⭐ | Custom (LurnKode) | **Quiz state machine, randomized exam, auto-grading** |
| `lms/progress-tracking` ⭐ | Custom (LurnKode) | **Enrollment, completion tracking, resume learning** |

---

## Database Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `database/pgvector` ⭐ | Custom (LurnKode) | **Vector search, embedding, HNSW index** cho RAG |
| `database/redis-queue` ⭐ | Custom (LurnKode) | **Submission queue với Redis** — job lifecycle, retry |
| `database/drizzle-orm` ⭐ | Custom (LurnKode) | **PostgreSQL schema + Drizzle ORM migrations** |

> ℹ️ `database/supabase` — Nếu dùng Supabase làm managed PostgreSQL hosting, skill này hỗ trợ các Supabase-specific patterns (như pgvector trong Supabase). Không phải tech stack chính.

---

## Backend Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `backend/elysiajs` ⭐ | Custom (LurnKode) | **PRIMARY** — Bun+ElysiaJS API: router, middleware, Eden type sharing |
| `backend/domain-modeling` | mattpocock/skills | Data model design cho complex domains |
| `backend/codebase-design` | mattpocock/skills | Architecture design, module boundaries |

> ~~`backend/fastapi`~~ — **Đã loại bỏ hoàn toàn** (team xác nhận Bun + ElysiaJS)

---

## Frontend Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `frontend/react-best-practices` | vercel-labs | React patterns, hooks, TanStack Query |
| `frontend/web-design-guidelines` | vercel-labs | Design system, typography, spacing |
| `frontend/frontend-design` | anthropics/skills | Frontend design principles |
| `frontend/vercel-optimize` | vercel-labs | Performance optimization, LCP |
| `frontend/composition-patterns` | vercel-labs | Component composition patterns |
| `frontend/react-view-transitions` | vercel-labs | Smooth page transitions |
| `frontend/web-artifacts-builder` | anthropics/skills | Build web artifacts |

> **Frontend framework đã xác nhận**: **Next.js + TypeScript** (App Router)

---

## UI/UX Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `ui-ux/ui-ux-pro-max` | nextlevelbuilder | Premium UI/UX generation — LMS pages |
| `ui-ux/design` | nextlevelbuilder | Design fundamentals |
| `ui-ux/design-system` | nextlevelbuilder | Build design system từ đầu |
| `ui-ux/ui-styling` | nextlevelbuilder | CSS, styling patterns |
| `ui-ux/brand` | nextlevelbuilder | Brand identity |
| `ui-ux/banner-design` | nextlevelbuilder | Marketing/banner assets |

---

## Security Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `security/cors-strict` ⭐ | Custom (LurnKode) | **CORS config, API key security, headers** |
| `security/secrets-management` | arjunprabhulal | Secrets vault, rotation |
| `security/security-scanning` | arjunprabhulal | Dependency scanning, SAST |

> ℹ️ `security/supabase-rls` — Nếu dùng Supabase hosting, giữ lại cho Supabase-specific RLS patterns. Tầng chính là **PostgreSQL RLS**.

---

## Testing Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `testing/coverage-80` ⭐ | Custom (LurnKode) | **CI coverage gate ≥ 80%** — `bun test --coverage` |
| `testing/webapp-testing` | anthropics/skills | Web app testing patterns |
| `testing/tdd-mattpocock` | mattpocock/skills | TDD approach (mattpocock style) |

> Testing tools: **Bun test** (unit/integration) · **Vitest + RTL** (frontend) · **Playwright** (E2E) · **RAGAS** (AI eval)

---

## CI/CD Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `cicd/ci-pipelines` ⭐ | arjunprabhulal | **GitHub Actions setup** — test + coverage + Docker build |
| `cicd/deployment-strategies` | arjunprabhulal | Blue/green, canary, rolling deploy |
| `cicd/pipeline-security` | arjunprabhulal | Secret scanning trong CI pipeline |
| `cicd/continuous-delivery` | arjunprabhulal | CD best practices |
| `cicd/build-optimization` | arjunprabhulal | Build time optimization |

---

## Infrastructure Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `infra/monorepo-structure` ⭐ | Custom (LurnKode) | **Monorepo layout, Bun workspaces** |
| `infra/observability` | arjunprabhulal | Metrics, logging, tracing |
| `infra/log-management` | arjunprabhulal | Log aggregation |
| `infra/incident-response` | arjunprabhulal | Incident runbooks |
| `infra/scalability-design` | arjunprabhulal | Scale horizontally khi cần |
| `infra/api-gateway` | arjunprabhulal | API gateway patterns |

---

## Quick Routing Matrix

| Task | Skills theo thứ tự |
|---|---|
| **Build feature mới** | `workflow-plan` → `core/planning` → `core/implement` → `core/tdd` |
| **Debug bug** | `workflow-debug` → `workflow-tdd` (Architecture Debug mode) |
| **Code review** | `workflow-code-review` → `core/code-review` |
| **AI Tutor (RAG)** | `ai/rag-pgvector` → `database/pgvector` → `ai/rag-citation` → `ai/ragas-eval` |
| **Code Judge (Docker Sandbox)** | `lms/sandbox-security` → `lms/judge0-integration` → `database/redis-queue` |
| **Database schema** | `database/drizzle-orm` → `database/pgvector` → `lms/course-hierarchy` |
| **Auth / RBAC** | `lms/rbac-lms` → `security/cors-strict` |
| **UI / Frontend** | `ui-ux/ui-ux-pro-max` → `frontend/react-best-practices` |
| **Testing** | `testing/coverage-80` → `testing/tdd-mattpocock` |
| **Security review** | `workflow-code-review` (Security Audit section) → `lms/sandbox-security` → `security/cors-strict` |
