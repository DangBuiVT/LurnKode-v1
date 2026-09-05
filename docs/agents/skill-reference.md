# Skill Reference — DevVerse

> Danh sách đầy đủ tất cả skills, khi nào dùng, và nguồn gốc.

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
| `core/prototype` | mattpocock/skills | Quick prototype để validate |

---

## AI / RAG Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `ai/rag-pgvector` ⭐ | Custom (DevVerse) | **Build AI Tutor RAG pipeline (5.1)** |
| `ai/ragas-eval` ⭐ | Custom (DevVerse) | **RAGAS evaluation — Faithfulness + Relevancy** |
| `ai/rag-citation` ⭐ | Custom (DevVerse) | **Citation format + out-of-scope handling** |
| `ai/langchain-rag` | langchain-ai/skills | LangChain RAG patterns tham khảo |
| `ai/langchain-fundamentals` | langchain-ai/skills | LangChain cơ bản |
| `ai/eval-engineering` | langchain-ai/skills | Evaluation engineering patterns |
| `ai/deep-agents-core` | langchain-ai/skills | Advanced agent patterns |
| `ai/claude-api` | anthropics/skills | Anthropic Claude API integration |

---

## LMS Domain Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `lms/judge0-integration` ⭐ | Custom (DevVerse) | **Build submission/judge endpoint (5.4)** |
| `lms/ast-plagiarism` ⭐ | Custom (DevVerse) | **AST plagiarism detection (5.4)** |
| `lms/sandbox-security` ⭐ | Custom (DevVerse) | **Security review sandbox code** |
| `lms/rbac-lms` ⭐ | Custom (DevVerse) | **Student/Instructor/Admin RBAC** |
| `lms/course-hierarchy` ⭐ | Custom (DevVerse) | **Course/Module/Lesson schema** |
| `lms/quiz-engine` ⭐ | Custom (DevVerse) | **Quiz state machine, auto-grading** |
| `lms/progress-tracking` ⭐ | Custom (DevVerse) | **Enrollment, completion tracking** |

---

## Database Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `database/supabase` ⭐ | Custom (DevVerse) | **Bất kỳ Supabase operation nào** |
| `database/pgvector` ⭐ | Custom (DevVerse) | **Vector search, embedding, HNSW** |
| `database/redis-queue` ⭐ | Custom (DevVerse) | **Submission queue, BullMQ/Celery** |

---

## Frontend Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `frontend/react-best-practices` | vercel-labs | React patterns, hooks best practices |
| `frontend/web-design-guidelines` | vercel-labs | Design system, typography, spacing |
| `frontend/nextjs` | Custom (DevVerse) | Next.js App Router, SSR, Supabase |
| `frontend/frontend-design` | anthropics/skills | Frontend design principles |
| `frontend/vercel-optimize` | vercel-labs | Performance optimization |
| `frontend/composition-patterns` | vercel-labs | Component composition patterns |
| `frontend/accessibility` | Custom (DevVerse) | WCAG, ARIA, keyboard nav |

---

## UI/UX Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `ui-ux/ui-ux-pro-max` | nextlevelbuilder | Premium UI/UX generation |
| `ui-ux/design` | nextlevelbuilder | Design fundamentals |
| `ui-ux/design-system` | nextlevelbuilder | Build design system |
| `ui-ux/ui-styling` | nextlevelbuilder | CSS, styling patterns |

---

## Backend Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `backend/fastapi` ⭐ | Custom (DevVerse) | **FastAPI REST API (nếu chọn Python)** |
| `backend/elysiajs` ⭐ | Custom (DevVerse) | **Bun+Elysia API (nếu chọn Node)** |
| `backend/api-design` | Custom (DevVerse) | REST conventions, response format |
| `backend/domain-modeling` | mattpocock/skills | Data model design |
| `backend/codebase-design` | mattpocock/skills | Architecture design |

---

## Security Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `security/supabase-rls` ⭐ | Custom (DevVerse) | **RLS policies, security review** |
| `security/cors-strict` ⭐ | Custom (DevVerse) | **CORS config, API key security** |
| `security/secrets-management` | arjunprabhulal | Secrets vault, rotation |
| `security/security-scanning` | arjunprabhulal | Dependency scanning, SAST |

---

## Testing Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `testing/coverage-80` ⭐ | Custom (DevVerse) | **Coverage gate CI setup** |
| `testing/unit` | Custom (DevVerse) | Pytest / Vitest unit patterns |
| `testing/integration` | Custom (DevVerse) | API integration tests |
| `testing/e2e` | Custom (DevVerse) | Playwright E2E tests |
| `testing/webapp-testing` | anthropics/skills | Web app testing patterns |
| `testing/load-testing` | arjunprabhulal | Performance/load testing |

---

## CI/CD Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `cicd/ci-pipelines` ⭐ | arjunprabhulal | **GitHub Actions setup** |
| `cicd/deployment-strategies` | arjunprabhulal | Blue/green, canary, rolling |
| `cicd/pipeline-security` | arjunprabhulal | Secret scanning trong CI |
| `cicd/deploy-to-vercel` | vercel-labs | Vercel deployment |
| `cicd/continuous-delivery` | arjunprabhulal | CD best practices |

---

## Infrastructure Skills

| Skill | Nguồn | Khi nào dùng |
|---|---|---|
| `infra/judge0-deploy` ⭐ | Custom (DevVerse) | **Deploy Judge0 lên Railway/Render** |
| `infra/monorepo-structure` ⭐ | Custom (DevVerse) | **Monorepo layout, workspaces** |
| `infra/observability` | arjunprabhulal | Metrics, logging, tracing |
| `infra/log-management` | arjunprabhulal | Log aggregation |
| `infra/incident-response` | arjunprabhulal | Incident runbooks |

---

> ⭐ = Critical skill cho DevVerse LMS (phải đọc trước khi implement feature liên quan)
