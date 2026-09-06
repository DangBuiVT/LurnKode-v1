# Workflow: Plan & Build New Feature — DevVerse

> Kích hoạt khi user nói: "build feature X", "tạo feature X", "implement X", "/plan"

---

## Bước 0 — Context Check (LUÔN LUÔN làm trước)

Trước khi làm bất cứ điều gì:
1. Đọc `docs/guides/tech-stack.md` → xác nhận stack đã chốt
2. Đọc `.agents/rules/` → áp dụng rules liên quan
3. Đọc `skill-manifest.md` → biết skills nào khả dụng
4. Nếu feature liên quan đến domain cụ thể → đọc skill đó trước

---

## Bước 1 — Phân tích yêu cầu

### 1.1 Xác định loại feature
| Nếu feature là... | Đọc thêm |
|---|---|
| UI/Component | `.agents/skills/frontend/`, `.agents/rules/frontend.md` |
| API endpoint | `.agents/skills/backend/elysiajs/`, `.agents/rules/backend.md` |
| Database schema | `.agents/skills/database/supabase/`, `.agents/rules/database.md` |
| RAG/AI | `.agents/skills/ai/rag-pgvector/`, `.agents/skills/ai/rag-citation/` |
| Code Judge | `.agents/skills/lms/judge0-integration/`, `.agents/skills/lms/sandbox-security/` |
| Auth/RBAC | `.agents/skills/lms/rbac-lms/`, `.agents/skills/security/supabase-rls/` |

### 1.2 Tạo implementation plan

Viết plan với format:
```
## Feature: [Tên feature]

### Phạm vi
- [ ] Backend: [endpoints cần tạo]
- [ ] Frontend: [components/pages cần tạo]
- [ ] Database: [schema thay đổi]
- [ ] Tests: [test cases cần viết]

### Files bị ảnh hưởng
- [list files]

### Dependencies
- [services, APIs, packages cần dùng]

### Estimated complexity: [Low / Medium / High]
```

**Hiện plan cho user và CHỜ APPROVAL trước khi code.**

---

## Bước 2 — Database First (nếu có schema change)

1. Viết migration SQL
2. Cập nhật Supabase RLS policies (đọc skill `security/supabase-rls`)
3. Cập nhật TypeScript types từ Supabase schema
4. Verify với `supabase db push` (local)

---

## Bước 3 — Backend (Bun + ElysiaJS)

Luôn theo thứ tự:
1. **Types first**: Định nghĩa input/output types với Elysia schema
2. **Middleware**: CORS → Auth → RBAC (dùng existing middleware)
3. **Handler**: Business logic (thin controllers, fat services)
4. **Service layer**: Logic thực sự nằm ở đây, không phải router
5. **Error handling**: Dùng Elysia error() với code chuẩn

Template endpoint:
```typescript
app.post('/api/[resource]',
  async ({ body, user }) => {
    // 1. Validate đầu vào (Elysia schema tự xử lý)
    // 2. Check authorization
    // 3. Call service
    // 4. Return response
  },
  {
    body: t.Object({ /* schema */ }),
    response: t.Object({ /* schema */ }),
  }
)
```

---

## Bước 4 — Frontend (React + TypeScript)

1. **Tạo component** → đặt đúng folder structure
2. **Data fetching** → dùng TanStack Query (KHÔNG fetch trực tiếp)
3. **Form** → React Hook Form + Zod validation
4. **Error/Loading states** → LUÔN có skeleton/spinner
5. **Accessibility** → semantic HTML, ARIA labels

---

## Bước 5 — Testing (TDD sau khi có skeleton)

Theo skill `testing/coverage-80`:
1. **Unit tests**: Service layer logic
2. **Integration tests**: API endpoints (dùng Bun test)
3. **E2E tests**: Happy path + edge cases (dùng Playwright)
4. **Coverage check**: `bun test --coverage` → phải >= 80%

---

## Bước 6 — Code Review Checklist

Trước khi mark "Done":
- [ ] Không có `any` trong TypeScript
- [ ] Tất cả async operations có error handling
- [ ] RLS policies đúng (không leak data giữa users)
- [ ] Không hardcode secrets (dùng `.env`)
- [ ] Performance: không có N+1 queries
- [ ] Tests pass và coverage >= 80%
- [ ] Không có TODO/FIXME chưa giải quyết

---

## Routing Skills

```
Feature mới → planning → implementation
Backend endpoint → elysiajs → rbac-lms → cors-strict
Frontend page → react-best-practices → web-design-guidelines
Database change → supabase → supabase-rls
AI feature → rag-pgvector → rag-citation
Test coverage → coverage-80 → tdd
```
