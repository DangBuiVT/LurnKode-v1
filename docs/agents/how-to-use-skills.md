# How to Use Skills — DevVerse

> Hướng dẫn sử dụng hệ thống AI skills trong Antigravity IDE.
> **Stack đã xác nhận**: Bun + ElysiaJS · Supabase · Redis · Judge0

---

## Cách skills hoạt động

Khi bạn làm việc với Antigravity AI trong DevVerse, AI tự động đọc `.agents/` để:
1. Áp dụng đúng **project rules** (conventions, security, testing...)
2. Gọi đúng **specialist skill** khi cần context chuyên sâu
3. Dùng đúng **agent persona** cho từng loại task
4. Follow **workflow** phù hợp cho build / debug / review

---

## Workflows — Gọi bằng ngôn ngữ tự nhiên

> Skills không gọi bằng `/` — nói chuyện bình thường, AI tự nhận biết workflow cần dùng.

| Bạn nói | Workflow được áp dụng |
|---|---|
| "build feature X", "implement X", "plan feature" | `workflow-plan.md` — 6 bước từ context đến review |
| "debug lỗi này", "tại sao X", "fix bug" | `workflow-debug.md` → `workflow-tdd.md` (Architecture Debug mode) |
| "viết test cho X", "tdd" | `workflow-tdd.md` (TDD mode) |
| "review code này", "xem lại PR" | `workflow-code-review.md` — architecture + security + improvements |

---

## Quick Reference: Task → Skill

### Tôi cần làm gì? → Dùng skill nào?

#### 🧱 Bắt đầu feature mới
```
workflow-plan → core/planning → core/implement → core/tdd → core/code-review
```

#### 🐛 Debug vấn đề
```
workflow-debug → workflow-tdd (Architecture Debug mode: audit 6 lớp → Root Cause Map → failing tests)
```

#### 🔍 Code Review
```
workflow-code-review → architecture review → security audit → improvement suggestions
```

#### 🤖 AI Tutor (RAG)
```
ai/rag-pgvector → database/pgvector → ai/rag-citation → ai/ragas-eval
```

#### ⚡ Code Judge / Sandbox
```
lms/judge0-integration → lms/sandbox-security → database/redis-queue → infra/judge0-deploy
```

#### 🚫 Anti-cheat
```
lms/ast-plagiarism → lms/sandbox-security → security/supabase-rls
```

#### 🗄️ Database schema mới
```
database/supabase → security/supabase-rls → lms/course-hierarchy (tham khảo)
```

#### 🔐 Authentication / RBAC
```
lms/rbac-lms → database/supabase → security/supabase-rls → security/cors-strict
```

#### 🎨 UI / Frontend
```
ui-ux/ui-ux-pro-max → frontend/react-best-practices → frontend/web-design-guidelines
```

#### 📦 Deploy
```
cicd/ci-pipelines → infra/judge0-deploy → cicd/deployment-strategies
```

#### 🧪 Testing
```
testing/coverage-80 → testing/tdd-mattpocock → testing/webapp-testing
```

---

## Agent Routing

Khi cần AI đảm nhận một vai trò cụ thể:

```
"Với tư cách là Architect, thiết kế submission pipeline..."
→ Antigravity đọc agents/architect.md + áp dụng skills phù hợp

"Review code này với vai trò Security Reviewer..."
→ Antigravity đọc agents/security-reviewer.md + skills: sandbox-security, supabase-rls, cors-strict
```

---

## Workflow chuẩn

```
1. PLAN    → workflow-plan.md     (context check → implementation plan → approval)
2. IMPL    → core/implement       (DB first → Backend → Frontend)
3. TEST    → workflow-tdd.md      (TDD mode: viết failing test trước)
4. REVIEW  → workflow-code-review.md  (architecture + security + suggestions)
5. VERIFY  → core/verification    (chạy lại tests, CI green, edge cases)
```

Khi có bug:
```
1. DEBUG   → workflow-debug.md        (phân loại, localize)
2. AUDIT   → workflow-tdd.md          (Architecture Debug: audit 6 lớp)
3. FIX     → viết failing test trước, sau đó fix
4. VERIFY  → test pass, coverage vẫn ≥ 80%
```

---

## Priority: Project > Vendor > Generic

Khi conflict giữa skills:
```
.agents/rules/*.md         ← LUÔN override (project-specific)
    >
.agents/skills/lms/        ← LMS domain knowledge
    >
.agents/skills/core/       ← Vendor harness (superpowers, mattpocock)
    >
Generic AI knowledge
```

---

## Update Skills

Khi vendor repo có update quan trọng:

```powershell
# Re-clone và copy lại
git clone --depth 1 https://github.com/obra/superpowers .tmp/superpowers
Copy-Item .tmp/superpowers/skills/writing-plans/SKILL.md .agents/skills/core/planning/SKILL.md -Force

# Update manifest
# Mở .agents/skill-manifest.md → update commit hash
```

---

## Thêm Custom Skill mới

```markdown
# 1. Tạo folder
mkdir .agents/skills/<domain>/<skill-name>

# 2. Tạo SKILL.md với frontmatter
---
name: my-skill
description: Mô tả ngắn gọn skill này làm gì.
---

# Skill Name

## Khi nào activate skill này
- ...

## Instructions
- ...
```

```powershell
# 3. Update skill-manifest.md
# 4. Update agents/skill-router.md nếu cần routing mới
```
