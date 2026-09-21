# LurnKode Agent Skill Manifest

> Ngày cài đặt: 2026-09-05  
> Project: CO3103 — LurnKode: AI-Assisted Learning Platform  
> Môi trường: `d:\LurnKode\.agents\skills\`

---

## Tier A — Vendor Skills (từ official repos)

### `obra/superpowers`
- **Repo**: https://github.com/obra/superpowers
- **Commit**: `b36e082` (2026-08-12)
- **License**: MIT
- **Install method**: `git clone --depth 1`
- **Skills installed**:
  - `core/planning` (writing-plans)
  - `core/tdd` (test-driven-development)
  - `core/debugging` (systematic-debugging)
  - `core/verification` (verification-before-completion)
  - `core/implementation` (subagent-driven-development)
  - `core/writing-skills`
  - `core/receiving-code-review`
  - `core/brainstorming`
  - `core/using-superpowers`
  - `core/git-worktrees` (using-git-worktrees)

### `anthropics/skills`
- **Repo**: https://github.com/anthropics/skills
- **Commit**: `41bbe19` (2026-09-03)
- **License**: Apache 2.0
- **Install method**: `git clone --depth 1`
- **Skills installed**:
  - `frontend/frontend-design`
  - `frontend/skill-creator`
  - `frontend/web-artifacts-builder`
  - `testing/webapp-testing`
  - `ai/claude-api`
  - `backend/mcp-builder`

### `vercel-labs/agent-skills`
- **Repo**: https://github.com/vercel-labs/agent-skills
- **Commit**: `063bee9` (2026-08-28)
- **License**: MIT
- **Install method**: `git clone --depth 1`
- **Skills installed**:
  - `frontend/react-best-practices`
  - `frontend/web-design-guidelines`
  - `frontend/composition-patterns`
  - `frontend/react-view-transitions`
  - `frontend/vercel-optimize`
  - `frontend/writing-guidelines`
  - `cicd/deploy-to-vercel`
  - `cicd/vercel-cli`

### `mattpocock/skills`
- **Repo**: https://github.com/mattpocock/skills
- **Commit**: `3cca18b` (2026-09-04)
- **License**: MIT
- **Install method**: `git clone --depth 1`
- **Skills installed** (engineering/):
  - `core/code-review`
  - `backend/codebase-design`
  - `core/diagnosing-bugs`
  - `backend/domain-modeling`
  - `core/implement`
  - `backend/improve-architecture`
  - `core/prototype`
  - `core/research`
  - `testing/tdd-mattpocock`
  - `core/to-spec`
  - `core/to-tickets`
  - `core/triage`
  - `core/wayfinder`
  - `core/grill-with-docs`
  - `core/merge-conflicts`

---

## Tier B — Specialist Vendor Skills

### `nextlevelbuilder/ui-ux-pro-max-skill`
- **Repo**: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Commit**: `f3ac195` (2026-09-03)
- **License**: Inspect required (no explicit license found)
- **Install method**: `git clone --depth 1` (scripts NOT run — manual copy only)
- **Skills installed**:
  - `ui-ux/ui-ux-pro-max`
  - `ui-ux/design`
  - `ui-ux/design-system`
  - `ui-ux/ui-styling`
  - `ui-ux/brand`
  - `ui-ux/banner-design`

### `arjunprabhulal/devops-skills`
- **Repo**: https://github.com/arjunprabhulal/devops-skills
- **Commit**: `0c89b7e` (2026-08-25)
- **License**: Apache 2.0
- **Install method**: `git clone --depth 1` (build script NOT run — manual copy)
- **Skills installed** (selected relevant only):
  - `cicd/ci-pipelines`
  - `cicd/continuous-delivery`
  - `cicd/deployment-strategies`
  - `cicd/pipeline-security`
  - `cicd/release-management`
  - `cicd/build-optimization`
  - `infra/observability`
  - `infra/metrics-monitoring`
  - `infra/log-management`
  - `infra/distributed-tracing`
  - `infra/incident-response`
  - `infra/runbooks`
  - `infra/scalability-design`
  - `infra/api-gateway`
  - `infra/load-testing`
  - `security/secrets-management`
  - `security/security-scanning`

### `langchain-ai/langchain-skills`
- **Repo**: https://github.com/langchain-ai/langchain-skills
- **Commit**: `b7a2a8f` (2026-08-28)
- **License**: MIT
- **Install method**: `git clone --depth 1`
- **Skills installed**:
  - `ai/langchain-rag` ← **Key skill for RAG AI Tutor**
  - `ai/langchain-fundamentals`
  - `ai/eval-engineering`
  - `ai/langchain-middleware`
  - `ai/deep-agents-core`
  - `ai/deep-agents-memory`
  - `ai/ecosystem-primer`
  - `ai/langchain-dependencies`

---

## Tier C — Custom Skills (LurnKode-specific, authored in-house)

### Database Domain
| Skill | Path | Reason |
|---|---|---|
| `pgvector` | `database/pgvector/` | Vector search, HNSW, cosine similarity, RAG pipeline |
| `redis-queue` | `database/redis-queue/` | Redis submission queue patterns |
| `drizzle-orm` | `database/drizzle-orm/` | Drizzle ORM schema, migration patterns (PostgreSQL) |

> ⚠️ `database/supabase` — Supabase có thể được dùng làm **managed PostgreSQL provider** cho môi trường dev/production. Không phải là tầng công nghệ chính — chỉ là lựa chọn hosting.

### AI / RAG Domain
| Skill | Path | Reason |
|---|---|---|
| `rag-pgvector` | `ai/rag-pgvector/` | Full RAG pipeline với pgvector — chunking, embedding, retrieval, citation |
| `ragas-eval` | `ai/ragas-eval/` | RAG evaluation framework (Recall@K, Precision@K, Grounding, Citation) |
| `rag-citation` | `ai/rag-citation/` | Citation format, out-of-scope handling |

### LMS Domain
| Skill | Path | Reason |
|---|---|---|
| `judge0-integration` | `lms/judge0-integration/` | Judge Worker implementation detail — Judge0 làm Docker-based execution engine |
| `sandbox-security` | `lms/sandbox-security/` | No injection, resource limits (1 CPU/128MB/3s), fail-safe |
| `rbac-lms` | `lms/rbac-lms/` | Learner/Instructor/Admin RBAC patterns |
| `course-hierarchy` | `lms/course-hierarchy/` | Course → Chapter → Lesson → Material data model |
| `quiz-engine` | `lms/quiz-engine/` | Quiz state machine, auto/manual grading |
| `progress-tracking` | `lms/progress-tracking/` | Enrollment, completion, resume learning |

> ⚠️ `lms/ast-plagiarism` — Đây là một phương pháp kỹ thuật phát hiện bất thường, KHÔNG phải thành phần bắt buộc của Integrity Monitoring MVP. Integrity events được log cho Instructor review.

### Testing Domain
| Skill | Path | Reason |
|---|---|---|
| `coverage-80` | `testing/coverage-80/` | >= 80% coverage gate — CI enforcement |

### Security Domain
| Skill | Path | Reason |
|---|---|---|
| `cors-strict` | `security/cors-strict/` | CORS config, API key security, headers |

> ⚠️ `security/supabase-rls` — Nếu dùng Supabase hosting, giữ lại như implementation detail. Tầng chính là **PostgreSQL RLS**.

### Infrastructure Domain
| Skill | Path | Reason |
|---|---|---|
| `monorepo-structure` | `infra/monorepo-structure/` | Monorepo layout, Bun workspaces |

### Backend Domain
| Skill | Path | Reason |
|---|---|---|
| `elysiajs` | `backend/elysiajs/` | **PRIMARY** — Bun + ElysiaJS patterns (stack đã xác nhận) |

> ⚠️ `fastapi` đã loại bỏ hoàn toàn — team xác nhận Bun + ElysiaJS (TypeScript full-stack)

---

## Summary Statistics

| Category | Count |
|---|---|
| Vendor skills (Tier A+B) | ~55 skills |
| Custom skills (Tier C) | ~18 skills |
| Agent personas | 10 agents |
| Project rules | 8 rules |
| **Workflow rules** | **4 workflows** |

### Workflow Rules (`.agents/rules/`)
| File | Trigger | Mô tả |
|---|---|---|
| `workflow-plan.md` | "build feature", "tạo feature", `/plan` | 6-bước feature planning |
| `workflow-debug.md` | "debug", "fix bug", `/debug` | Systematic debugging |
| `workflow-tdd.md` | "viết test", "tdd", `/tdd-workflow` | TDD với Bun + Playwright + RAGAS |
| `workflow-code-review.md` | "review code", `/code-review` | Review toàn diện |

---

## Maintenance

### Khi cần update vendor skill
```powershell
cd d:\LurnKode\.tmp\superpowers
git pull
# Copy lại SKILL.md nếu có changes quan trọng
```

### Tech stack decisions (xác nhận theo Đề án LurnKode)
- ✅ **Frontend**: Next.js + TypeScript (App Router)
- ✅ **Backend**: Bun + ElysiaJS — `fastapi` skill đã prune
- ✅ **Database**: PostgreSQL + Drizzle ORM + pgvector
- ✅ **Queue/Cache**: Redis
- ✅ **Code Execution**: Judge Worker → Docker Sandbox (1 CPU, 128MB, 3s)
- ✅ **AI**: LLM + Embeddings + RAG (course-grounded)
- ✅ **Deployment**: Docker + CI/CD (GitHub Actions)
- ✅ **Git**: Feature branch workflow
- ℹ️ **LLM Provider**: TBD (Gemini vs OpenAI — xem `docs/guides/tech-stack.md`)
- ℹ️ **Supabase**: Có thể dùng làm managed PostgreSQL hosting (không phải tech layer chính)

### Khi thêm skill mới
- Cập nhật file này với entry mới
- Update `agents/skill-router.md` nếu cần routing mới
