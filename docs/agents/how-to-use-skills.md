# How to Use Skills — DevVerse

> Hướng dẫn sử dụng hệ thống AI skills trong Antigravity IDE.

---

## Cách skills hoạt động

Khi bạn làm việc với Antigravity AI trong DevVerse, AI tự động đọc `.agents/` để:
1. Áp dụng đúng **project rules** (conventions, security, testing...)
2. Gọi đúng **specialist skill** khi cần context chuyên sâu
3. Dùng đúng **agent persona** cho từng loại task

---

## Quick Reference: Task → Skill

### Tôi cần làm gì? → Dùng skill nào?

#### 🧱 Bắt đầu feature mới
```
core/planning → core/implement → core/tdd → core/code-review → core/verification
```

#### 🤖 AI Tutor (component 5.1)
```
ai/rag-pgvector → database/pgvector → ai/rag-citation → ai/ragas-eval
```

#### ⚡ Code Judge / Sandbox (component 5.4)
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
cicd/deployment-strategies → infra/judge0-deploy → cicd/deploy-to-vercel
```

#### 🧪 Testing
```
testing/coverage-80 → testing/tdd-mattpocock → testing/webapp-testing
```

#### 🔍 Debug bug
```
core/diagnosing-bugs → core/systematic-debugging → core/verification
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

## Workflow chuẩn (Superpowers Harness)

```
1. PLAN     → core/planning         (tạo implementation plan)
2. IMPL     → core/implement        (viết code)
3. TEST     → core/tdd              (viết tests)
4. REVIEW   → core/code-review      (review trước khi merge)
5. VERIFY   → core/verification     (chạy lại tests, kiểm tra edge cases)
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
