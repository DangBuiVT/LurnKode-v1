# Skill Router — LurnKode LMS Agent

Tôi là skill router của LurnKode. Khi nhận yêu cầu, tôi tự động xác định task type và recommend skills phù hợp.

## Nguyên tắc routing

```
Nhận yêu cầu
    ↓
Xác định task type
    ↓
Recommend skills (ordered by priority)
    ↓
Invoke skill
    ↓
Execute → Test → Review → Verify
```

## Routing Matrix

| Task type | Skills được recommend |
|---|---|
| **Tạo feature mới** | `planning` → `implementation` → `tdd` → `code-review` → `verification` |
| **Sửa bug** | `diagnosing-bugs` → `systematic-debugging` → `tdd` → `verification` |
| **UI/Frontend** | `ui-ux-pro-max` → `react-best-practices` → `web-design-guidelines` → `frontend-design` |
| **API/Backend** | `elysiajs` → `rbac-lms` → `sandbox-security` → `cors-strict` |
| **Database schema** | `database/pgvector` → `database/drizzle-orm` → `lms/course-hierarchy` |
| **RAG / AI Tutor** | `rag-pgvector` → `pgvector` → `rag-citation` → `ragas-eval` |
| **Sandbox/Judge** | `lms/sandbox-security` → `lms/judge0-integration` → `database/redis-queue` |
| **Quiz/Assignment** | `quiz-engine` → `testing/coverage-80` |
| **Progress/Enrollment** | `course-hierarchy` → `progress-tracking` |
| **CI/CD** | `ci-pipelines` → `coverage-80` → `deployment-strategies` → `pipeline-security` |
| **Security review** | `sandbox-security` → `security/cors-strict` → `secrets-management` |
| **Testing** | `coverage-80` → `tdd` → `webapp-testing` |
| **Code review** | `core/code-review` → `receiving-code-review` |
| **TypeScript** | `codebase-design` → `domain-modeling` → `improve-codebase-architecture` |

## LMS Domain Routing

### Feature: AI Tutor (RAG)
```
rag-pgvector → pgvector → rag-citation → ragas-eval → langchain-rag
```

### Feature: Automated Code Assessment (Judge Worker + Docker Sandbox)
```
lms/sandbox-security → lms/judge0-integration → database/redis-queue → testing/coverage-80
```

### Feature: Course Management
```
lms/course-hierarchy → lms/rbac-lms → lms/progress-tracking
```

### Feature: Quiz/Assignment
```
lms/quiz-engine → lms/rbac-lms → testing/coverage-80
```

### Feature: Auth / RBAC
```
lms/rbac-lms → security/cors-strict
```

## Khi user hỏi "skill nào tôi nên dùng?"

Trả lời theo format:
```
Recommended skills: [list]
Reason: [brief explanation]
Workflow: /skill1 → /skill2 → /skill3
Related skills: [list]
```

## Conflict Resolution

```
Project-specific skill (lms/, database/)
    >
Vendor skill (superpowers, mattpocock, vercel)
    >
Generic skill
```

Project rules trong `.agents/rules/` luôn override external skills.

---

## Workflow Triggers (tự động load khi nhận từ khóa)

| Từ khóa nhận được | Workflow file cần đọc |
|---|---|
| "build feature", "tạo feature", "implement", "plan", `/plan` | `rules/workflow-plan.md` |
| "debug", "fix bug", "lỗi", "tại sao", `/debug` | `rules/workflow-debug.md` |
| "viết test", "tdd", "thêm test", `/tdd-workflow` | `rules/workflow-tdd.md` |
| "review code", "xem lại", "code review", `/code-review` | `rules/workflow-code-review.md` |

> **Quan trọng**: `/code-review` review KHÔNG CHỈ uncommitted changes — review cả files user đề cập trực tiếp và files liên quan trong conversation.

## Tech Stack Reference (đã xác nhận)

```
Project  : LurnKode — AI-Assisted Learning Platform
Frontend : Next.js + TypeScript (App Router) ✅
Backend  : Bun + ElysiaJS (TypeScript) ✅
API      : REST API ✅
Database : PostgreSQL + Drizzle ORM ✅
Vector   : pgvector (trong PostgreSQL) ✅
Queue    : Redis (Submission Queue + Cache) ✅
AI       : LLM + Embeddings + RAG (course-grounded) ✅
Judge    : Judge Worker → Docker Sandbox ✅
           (Triển khai: Judge0 là candidate cho Docker-based execution)
Deploy   : Docker + CI/CD (GitHub Actions) ✅
```
