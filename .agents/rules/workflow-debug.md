# Workflow: Debug — DevVerse

> Kích hoạt khi user nói: "debug này", "tại sao lỗi X", "fix bug", "/debug"

---

## Nguyên tắc cốt lõi

> **Không đoán. Chỉ hành động sau khi có bằng chứng.**
> Đọc skill `core/systematic-debugging` trước khi bắt đầu nếu bug phức tạp.

---

## Bước 1 — Thu thập thông tin

Hỏi user (nếu chưa có đủ):
1. **Triệu chứng**: Lỗi gì? Error message chính xác là gì?
2. **Reproduction steps**: Làm sao để reproduce?
3. **Context**: Xảy ra ở đâu? (Frontend / Backend / Database / CI)
4. **Recent changes**: Gần đây có commit gì liên quan không?

---

## Bước 2 — Phân loại bug

| Loại bug | Dấu hiệu | Tools cần dùng |
|---|---|---|
| **Frontend UI** | Layout sai, component không render | Chrome DevTools, React DevTools |
| **API 4xx** | Unauthorized, validation error | Đọc Elysia error code, check RBAC |
| **API 5xx** | Internal Server Error | Backend logs, Bun error stack |
| **Database** | Query lỗi, RLS block | Supabase Dashboard, `explain analyze` |
| **Type error** | TypeScript compile error | `bun tsc --noEmit` |
| **Test failure** | CI red, test output | `bun test --verbose` |
| **Performance** | Slow response | Bun profiler, query explain plan |
| **Auth** | 401, session expired | Supabase Auth logs |

---

## Bước 3 — Localize (thu hẹp phạm vi)

Làm theo thứ tự, dừng lại khi tìm thấy root cause:

```
1. Đọc error message đầy đủ (kể cả stack trace)
   ↓
2. Xác định layer (Frontend / Backend / Database / External service)
   ↓
3. Tìm file liên quan (grep_search, view_file)
   ↓
4. Reproduce locally (bun dev + test case)
   ↓
5. Thêm logging tạm thời nếu cần
   ↓
6. Viết failing test (trước khi fix — TDD principle)
```

---

## Bước 4 — Fix

1. **Fix minimal**: Chỉ thay đổi đủ để fix bug, không refactor thêm
2. **Verify fix**: Chạy lại test case → thấy test pass
3. **Regression check**: Chạy toàn bộ test suite
4. **Review side effects**: Fix có ảnh hưởng đến RLS / auth / other features không?

---

## Bước 5 — Code Review (sau khi fix)

> Đọc skill `core/code-review` (mattpocock) cho phần này.

**Đặc biệt cho DevVerse**: Code review KHÔNG CHỈ xem commit mới nhất.
Review cả:
- File/function mà user đề cập trực tiếp trong yêu cầu
- File liên quan đến bug (đã mention trong Bước 1)
- Files trong context của conversation hiện tại

Checklist sau khi fix:
- [ ] Fix không introduce thêm `any`
- [ ] Fix không bỏ qua error handling
- [ ] Không có hardcoded values
- [ ] Test coverage không giảm
- [ ] Không có side effects với RLS/Auth

---

## Common Bugs trong DevVerse

### Bug: Supabase RLS block không mong muốn
```sql
-- Debug: Kiểm tra policy
SELECT * FROM pg_policies WHERE tablename = 'your_table';
-- Test policy với specific user
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "user-id"}';
SELECT * FROM your_table;
```

### Bug: Judge0 không trả kết quả
1. Kiểm tra Judge0 service health: `GET /system_info`
2. Kiểm tra Redis queue: `LLEN bull:submissions:wait`
3. Xem worker logs: BullMQ job status
4. Decode base64 output trước khi display

### Bug: RAG trả kết quả không liên quan
1. Kiểm tra similarity threshold (mặc định 0.55)
2. Kiểm tra chunk size và overlap
3. Log cosine similarity scores của top-5 chunks
4. Xem out-of-scope check có bị trigger không

### Bug: Elysia type mismatch
```bash
bun tsc --noEmit  # Kiểm tra type errors
```
Elysia Eden type mismatch thường do schema không sync giữa backend và frontend.
