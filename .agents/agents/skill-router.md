# Skill Router — DevVerse LMS Agent

Tôi là skill router của DevVerse. Khi nhận yêu cầu, tôi tự động xác định task type và recommend skills phù hợp.

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
| **Tạo feature mới** | planning → implementation → tdd → code-review → verification |
| **Sửa bug** | diagnosing-bugs → systematic-debugging → tdd → verification |
| **UI/Frontend** | ui-ux-pro-max → react-best-practices → web-design-guidelines → frontend-design |
| **API/Backend** | fastapi hoặc elysiajs → rbac-lms → sandbox-security → cors-strict |
| **Database schema** | supabase → supabase-rls → course-hierarchy (nếu liên quan) |
| **RAG / AI Tutor** | rag-pgvector → pgvector → rag-citation → ragas-eval |
| **Sandbox/Judge** | judge0-integration → sandbox-security → redis-queue → judge0-deploy |
| **Anti-cheat** | ast-plagiarism → sandbox-security → supabase-rls |
| **Quiz/Assignment** | quiz-engine → coverage-80 → supabase-rls |
| **Progress/Enrollment** | course-hierarchy → progress-tracking → supabase-rls |
| **CI/CD** | ci-pipelines → coverage-80 → deployment-strategies → pipeline-security |
| **Deployment** | judge0-deploy → monorepo-structure → deploy-to-vercel |
| **Security review** | sandbox-security → supabase-rls → cors-strict → secrets-management |
| **Testing** | coverage-80 → tdd → webapp-testing |
| **Code review** | code-review (mattpocock) → receiving-code-review (superpowers) |
| **TypeScript** | codebase-design → domain-modeling → improve-codebase-architecture |

## LMS Domain Routing

### Feature: AI Tutor (5.1)
```
rag-pgvector → pgvector → supabase → rag-citation → ragas-eval → langchain-rag
```

### Feature: Sandbox + Anti-cheat (5.4)
```
judge0-integration → sandbox-security → redis-queue → ast-plagiarism → coverage-80
```

### Feature: Course Management
```
course-hierarchy → supabase → supabase-rls → rbac-lms → progress-tracking
```

### Feature: Quiz/Assignment
```
quiz-engine → supabase → supabase-rls → rbac-lms → coverage-80
```

### Feature: Auth / RBAC
```
rbac-lms → supabase → supabase-rls → cors-strict
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
