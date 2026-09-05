# DevVerse Agent Skill Manifest

> Ngày cài đặt: 2026-09-05  
> Project: CO3103 — DevVerse Cloud Programming Academy  
> Môi trường: `d:\DevVerse\.agents\skills\`

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
  - `ai/langchain-rag` ← **Key skill for RAG AI Tutor (5.1)**
  - `ai/langchain-fundamentals`
  - `ai/eval-engineering`
  - `ai/langchain-middleware`
  - `ai/deep-agents-core`
  - `ai/deep-agents-memory`
  - `ai/ecosystem-primer`
  - `ai/langchain-dependencies`

---

## Tier C — Custom Skills (DevVerse-specific, authored in-house)

### Database Domain
| Skill | Path | Reason |
|---|---|---|
| `supabase` | `database/supabase/` | Supabase RLS, Auth, Storage, pgvector patterns |
| `pgvector` | `database/pgvector/` | Vector search, HNSW, cosine similarity, RAG pipeline |
| `redis-queue` | `database/redis-queue/` | BullMQ/Celery submission queue patterns |

### AI / RAG Domain
| Skill | Path | Reason |
|---|---|---|
| `rag-pgvector` | `ai/rag-pgvector/` | Full RAG pipeline với pgvector + Supabase |
| `ragas-eval` | `ai/ragas-eval/` | RAGAS evaluation framework (5.1 requirement) |
| `rag-citation` | `ai/rag-citation/` | Citation format, out-of-scope handling |

### LMS Domain
| Skill | Path | Reason |
|---|---|---|
| `judge0-integration` | `lms/judge0-integration/` | Judge0 API, submission lifecycle, multi-testcase |
| `ast-plagiarism` | `lms/ast-plagiarism/` | AST structural detection vs string matching (5.4) |
| `sandbox-security` | `lms/sandbox-security/` | No injection, resource limits, fail-safe |
| `rbac-lms` | `lms/rbac-lms/` | Student/Instructor/Admin RBAC patterns |
| `course-hierarchy` | `lms/course-hierarchy/` | Course/Module/Lesson data model |
| `quiz-engine` | `lms/quiz-engine/` | Quiz state machine, auto/manual grading |
| `progress-tracking` | `lms/progress-tracking/` | Enrollment, completion, analytics |

### Testing Domain
| Skill | Path | Reason |
|---|---|---|
| `coverage-80` | `testing/coverage-80/` | >=80% coverage gate — CI enforcement |

### Security Domain
| Skill | Path | Reason |
|---|---|---|
| `supabase-rls` | `security/supabase-rls/` | RLS policy patterns, helper functions |
| `cors-strict` | `security/cors-strict/` | CORS config, API key security, headers |

### Infrastructure Domain
| Skill | Path | Reason |
|---|---|---|
| `judge0-deploy` | `infra/judge0-deploy/` | Judge0 self-host on Railway/Render free |
| `monorepo-structure` | `infra/monorepo-structure/` | Monorepo layout, workspace config |

### Backend Domain
| Skill | Path | Reason |
|---|---|---|
| `fastapi` | `backend/fastapi/` | FastAPI + Pydantic patterns (Python stack option) |
| `elysiajs` | `backend/elysiajs/` | Bun + Elysia patterns (Node stack option) |

---

## Summary Statistics

| Category | Count |
|---|---|
| Vendor skills (Tier A+B) | ~55 skills |
| Custom skills (Tier C) | 20 skills |
| Agent personas | 10 agents |
| Project rules | 8 rules |
| **Total files** | **~93 files** |

---

## Maintenance

### Khi cần update vendor skill
```powershell
cd d:\DevVerse\.tmp\superpowers
git pull
# Copy lại SKILL.md nếu có changes quan trọng
```

### Khi tech stack được quyết định
- Prune skills không dùng (fastapi hoặc elysiajs — giữ 1)
- Update `rules/backend.md` với conventions cụ thể
- Update `agents/backend-engineer.md` với stack đã chọn

### Khi thêm skill mới
- Cập nhật file này với entry mới
- Update `agents/skill-router.md` nếu cần routing mới
