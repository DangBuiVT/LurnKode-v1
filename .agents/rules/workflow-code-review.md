# Workflow: Code Review — DevVerse

> Kích hoạt khi user nói: "review code này", "xem lại", "code review", "/code-review"
> Đọc thêm skill `core/code-review` (mattpocock) và `core/receiving-code-review` (superpowers)

---

## Nguyên tắc Review trong DevVerse

**Review là CHẨN ĐOÁN TOÀN HỆ THỐNG, không phải đọc từng file.**

Phạm vi bắt buộc:
1. Code/files mà user **đề cập trực tiếp**
2. **Toàn bộ kiến trúc liên quan** — trace ngược từ triệu chứng qua tất cả các lớp
3. Staged/unstaged changes trong Git
4. **Security của cả system** — không chỉ file đang xem
5. **Đề xuất cải thiện** proactive — performance, UX, scalability

---

## Bước 1 — Thu thập Context Toàn Diện

```bash
# Git context
git diff HEAD~1          # Changes gần nhất
git status               # Staged/unstaged
git log --oneline -10    # Recent commits liên quan

# Đọc architecture overview TRƯỚC
# .agents/rules/ → tìm rules liên quan đến domain
# docs/guides/tech-stack.md → confirm stack
```

Đọc **theo thứ tự từ ngoài vào trong**:
1. File/component user đề cập
2. Các files import/export từ file đó
3. Service layer tương ứng
4. Route/API handler
5. Database schema + RLS

---

## Bước 2 — Kiến Trúc Review (LUÔN LÀM)

Với mỗi vấn đề hoặc feature đang review, vẽ lại luồng đầy đủ và audit từng lớp:

```
[Browser] → [React Component] → [Hook/Query] → [Service] → [API Client]
                                                                  ↓
                                              [Elysia Route] → [Middleware] → [Handler] → [Service]
                                                                                               ↓
                                                                              [Supabase/Redis/Judge0/LLM]
```

### Lớp 1 — Frontend Architecture
| Điểm kiểm tra | Vấn đề thường gặp |
|---|---|
| Component responsibility | Component quá fat (fetch + logic + render trong 1 file)? |
| State co-location | State có đặt đúng chỗ (server vs client vs global)? |
| TanStack Query usage | Có fetch trực tiếp trong component không? |
| Re-render optimization | `useMemo`/`useCallback` có dùng đúng chỗ không? |
| Error boundaries | Có component-level error boundary chưa? |
| Accessibility | Semantic HTML, ARIA, keyboard navigation đủ chưa? |

### Lớp 2 — API Contract
| Điểm kiểm tra | Vấn đề thường gặp |
|---|---|
| Elysia Eden type sync | Frontend types có lệch với backend schema không? |
| Error response format | Backend có trả `{ error, code }` nhất quán không? |
| HTTP status codes | 200 cho lỗi không? 201 cho create chưa? |
| Versioning | Breaking changes có được handle không? |

### Lớp 3 — Backend Logic
| Điểm kiểm tra | Vấn đề thường gặp |
|---|---|
| Middleware order | `CORS → Auth → RBAC → Handler` đúng thứ tự chưa? |
| Service layer thin | Logic nằm ở handler không? (phải ở service) |
| External API resilience | Timeout + retry cho Judge0, LLM chưa? |
| Transaction safety | Nhiều DB writes có trong transaction không? |
| Memory leaks | Stream, event listeners có được cleanup không? |

### Lớp 4 — Database + Security
| Điểm kiểm tra | Vấn đề thường gặp |
|---|---|
| RLS completeness | Tất cả bảng đều có RLS policies chưa? |
| Query efficiency | N+1 queries? Missing indexes? |
| pgvector | HNSW index built? Similarity threshold hợp lý? |
| Data integrity | Foreign key constraints đúng chưa? |

### Lớp 5 — Infrastructure
| Điểm kiểm tra | Vấn đề thường gặp |
|---|---|
| Queue reliability | Dead letter queue cho failed jobs? |
| Judge0 sandbox | Resource limits (CPU/RAM/time) đặt chưa? |
| Environment parity | Dev vs Prod config có gap nguy hiểm không? |
| Logging coverage | Đủ logs để debug production issue không? |

---

## Bước 3 — Security Audit Toàn Hệ Thống

> Không chỉ file đang review — kiểm tra security của TOÀN BỘ system.

### 3.1 Authentication & Authorization
- [ ] **Mọi API route** đều có auth middleware (không có route nào bị bỏ sót)
- [ ] RBAC check đúng: Student / Instructor / Admin không cross-access
- [ ] Supabase `service_role` key **tuyệt đối không** ở frontend bundle
- [ ] JWT expiry được handle — auto-refresh Supabase client
- [ ] Session invalidation khi logout hoạt động đúng

### 3.2 Row Level Security (RLS)
- [ ] **Tất cả bảng** có RLS enabled (không có bảng nào public không kiểm soát)
- [ ] Student chỉ thấy data của mình (submissions, quiz_attempts, progress)
- [ ] Instructor chỉ quản lý courses của mình
- [ ] Worker service (Judge0 callback) có RLS bypass hợp lệ với service role
- [ ] Không có policy `USING (true)` không có điều kiện

### 3.3 Input & Output Sanitization
- [ ] **Tất cả input** được validate qua Elysia schema (không có `any` untyped)
- [ ] Code submission: size limit + language whitelist
- [ ] Judge0 output: sanitize stdout/stderr trước khi lưu và hiển thị
- [ ] SQL injection: không có raw SQL string interpolation
- [ ] XSS: không có `dangerouslySetInnerHTML` với user content

### 3.4 Secrets & Configuration
- [ ] Không có hardcoded API keys, passwords, tokens trong code
- [ ] `.env`, `.env.local` trong `.gitignore`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` chỉ có ở server-side env
- [ ] LLM API key không bị expose trong client bundle
- [ ] Judge0 auth token không bị log

### 3.5 CORS & Network
- [ ] CORS origin whitelist cụ thể (không dùng `*` ở production)
- [ ] HTTPS enforced (không có HTTP redirect bị bỏ qua)
- [ ] Rate limiting cho submission API (chống abuse Judge0)
- [ ] API endpoint không bị exposed ở CDN cache không mong muốn

### 3.6 Code Execution Security (Sandbox)
- [ ] Judge0 sandbox isolates đúng (không escape container)
- [ ] Resource limits: CPU time, memory, process count
- [ ] Network access disabled trong sandbox
- [ ] Language whitelist enforce đúng
- [ ] Không có path traversal trong file handling

---

## Bước 4 — Improvement Suggestions (Proactive)

> Không chỉ tìm lỗi — chủ động đề xuất nâng cấp dù không được hỏi.

### 4.1 Performance Improvements
Kiểm tra và đề xuất:
- **Query optimization**: N+1, missing index, unneeded joins
- **Caching**: Có thể Redis cache kết quả nào? (leaderboard, course stats, embedding)
- **Bundle size**: Lazy load được component nào? Code splitting?
- **Network**: Có thể batch requests không? Debounce user input?
- **DB connection**: Connection pooling cấu hình đúng chưa?

```typescript
// Đề xuất format:
// ❌ Current: [mô tả vấn đề] — Tác động: [p95 latency / bundle size]
// ✅ Suggested: [giải pháp cụ thể] — Expected improvement: [ước tính]
```

### 4.2 UI/UX Improvements
Kiểm tra và đề xuất:
- **Loading states**: Có skeleton screen cho async data không?
- **Empty states**: Trang trống khi chưa có data?
- **Error messages**: Error có friendly, actionable không?
- **Optimistic updates**: Có thể update UI ngay trước khi server confirm?
- **Accessibility**: Color contrast, screen reader support?
- **Mobile responsiveness**: Breakpoints đầy đủ chưa?
- **Micro-interactions**: Feedback visual cho user actions?

### 4.3 Code Quality Improvements
- **Abstraction opportunities**: Code lặp có thể extract thành util/hook?
- **Type narrowing**: `as Type` unsafe cast có thể replace bằng type guard?
- **Error handling patterns**: Consistent error handling across service layer?
- **Naming clarity**: Tên biến/function có self-documenting không?

### 4.4 Scalability Improvements
- **Database**: Index nào sẽ cần khi data tăng lên 10x?
- **Queue**: Worker concurrency có scale được không?
- **RAG pipeline**: Chunk strategy có tối ưu cho corpus size dự kiến?
- **Judge0**: Rate limit khi nhiều student submit cùng lúc?

---

## Bước 5 — Testing Coverage Review
- [ ] Có unit tests cho business logic mới/thay đổi
- [ ] Coverage >= 80% (chạy `bun test --coverage`)
- [ ] Edge cases được test: empty input, max size, invalid auth, expired token
- [ ] Nếu thiếu test → đề xuất test cases cần viết (link sang `workflow-tdd.md`)

---

## Bước 6 — Output Format

```markdown
## Code Review: [Tên feature/PR/vấn đề]

### 🗺️ Architecture Trace
[Mô tả luồng đã audit và các lớp đã kiểm tra]

---

### 🔴 Critical — Phải fix trước merge/deploy
| Lớp | File:Line | Vấn đề | Fix đề xuất |
|---|---|---|---|
| Security | auth/middleware.ts:45 | Service role key accessible từ client | Move to server-only env |
| Backend | services/judge0.ts:88 | Không có timeout | Add `AbortSignal.timeout(5000)` |

### 🟡 Important — Nên fix trong sprint này
| Lớp | File:Line | Vấn đề | Fix đề xuất |
|---|---|---|---|
| Database | - | Missing index trên `submissions.user_id` | `CREATE INDEX CONCURRENTLY` |
| Frontend | QuizPage.tsx:112 | N+1 render khi update answer | Memoize với `useMemo` |

### 🟢 Minor — Nice to have
- [Style, naming, refactor nhỏ]

### 💡 Improvement Suggestions
**Performance**: [Đề xuất + expected impact]
**UI/UX**: [Đề xuất + user impact]
**Scalability**: [Đề xuất + khi nào cần]

### 🔒 Security Summary
- Critical issues: [số lượng]
- [x] Authentication: OK / ❌ ISSUE
- [x] RLS: OK / ❌ ISSUE
- [x] Input validation: OK / ❌ ISSUE
- [x] Secrets: OK / ❌ ISSUE
- [x] Sandbox: OK / ❌ ISSUE

### ✅ Good Practices Found
- [Positive feedback — luôn có ít nhất 1 điểm tích cực]

### 📋 Tests Cần Viết
- [ ] [Test case 1 để cover critical fix]
- [ ] [Regression test cho lớp liên quan]
→ Chạy `/tdd-workflow` để implement

### Coverage
- Current: X% | Target: >= 80%
- Uncovered critical paths: [list]
```

---

## DevVerse-Specific Anti-patterns

```typescript
// ❌ Fetch trực tiếp từ component
const Component = () => {
  useEffect(() => {
    supabase.from('courses').select('*').then(setData) // SAI
  }, [])
}
// ✅ Dùng TanStack Query + service layer
const { data } = useCourses()

// ❌ Service role key ở frontend
createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY) // SAI nếu bundled
// ✅ Server-side only — Next.js server component hoặc Elysia backend

// ❌ No timeout cho external service
await judge0.submit(code) // có thể hang mãi
// ✅ Với timeout
await judge0.submit(code, { signal: AbortSignal.timeout(10_000) })

// ❌ RLS missing cho bảng mới
CREATE TABLE plagiarism_reports (...); -- không có RLS
-- ✅ Luôn enable RLS ngay khi create table
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
```
