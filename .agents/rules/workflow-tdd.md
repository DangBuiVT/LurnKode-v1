# Workflow: TDD + Architecture Debug — DevVerse

> Kích hoạt khi user nói: "viết test", "tdd", "thêm test cho X", "/tdd-workflow"
> **CŨNG kích hoạt khi user mô tả vấn đề/bug** — TDD là công cụ để CHỨNG MINH root cause, không chỉ viết test
> Đọc thêm skill `core/tdd` (superpowers), `core/systematic-debugging`, `testing/coverage-80`

---

## Hai chế độ hoạt động

```
Nếu user nêu vấn đề / bug  → Chế độ ARCHITECTURE DEBUG (Bước A)
Nếu user muốn viết test     → Chế độ TDD THUẦN (Bước 1)
```

---

# ═══════════════════════════════════════
# CHẾ ĐỘ A: ARCHITECTURE DEBUG
# Khi user mô tả VẤN ĐỀ hoặc BUG
# ═══════════════════════════════════════

> **Nguyên tắc**: Không bao giờ fix triệu chứng mà không hiểu toàn bộ chuỗi nguyên nhân.
> Một bug ở UI có thể có root cause ở DB, security, hoặc architecture — phải trace đủ lớp.

## Bước A1 — Vẽ bản đồ luồng dữ liệu cho vấn đề

Trước khi đọc bất kỳ dòng code nào, vẽ lại luồng đầy đủ của tính năng bị lỗi:

```
Browser (User action)
  ↓ HTTP Request
Frontend Component → Hook → Service → API Client
  ↓ REST / fetch
Elysia Router → Middleware (CORS → Auth → RBAC) → Handler → Service
  ↓
Supabase (PostgreSQL + RLS) / Redis (BullMQ) / Judge0 / LLM API
  ↓ Response
Frontend State → UI Re-render
```

**Khoanh vùng** bước nào trong luồng này bị ảnh hưởng theo mô tả của user.

---

## Bước A2 — Audit từng lớp kiến trúc

Duyệt **toàn bộ** các lớp dưới đây. Không bỏ qua lớp nào dù vẻ ngoài không liên quan.
Ghi nhận findings ở mỗi lớp — dù chỉ "OK" hay "Chưa kiểm tra được".

### Lớp 1: Frontend (UI/UX + State)
Đọc files: components liên quan, hooks, service calls

| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| State management | State có bị stale sau mutation không? Cache invalidation? |
| Error handling | Có hiện error state cho user không? Hay fail silent? |
| Loading states | Race condition giữa nhiều async requests không? |
| Input validation | Validate ở client trước khi gửi lên không? |
| Auth token | Token còn hạn không? Tự refresh chưa? |
| UX flow | User có biết vấn đề xảy ra không? |

### Lớp 2: API Contract (Frontend ↔ Backend)
Đọc: Elysia route definitions, Eden client calls

| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| Type sync | Elysia schema và frontend types có khớp nhau không? |
| Error codes | Backend trả error code gì? Frontend có handle đủ cases? |
| Request shape | Body/params có đúng format không? |
| Auth headers | JWT được gửi đúng header không? |

### Lớp 3: Backend Logic (ElysiaJS)
Đọc: router, handler, service layer

| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| Middleware order | CORS → Auth → RBAC → Handler — có đúng thứ tự không? |
| Business logic | Service layer có race conditions không? |
| External calls | Timeout cho Judge0, LLM API có đặt chưa? |
| Error propagation | Lỗi từ Supabase/Redis được catch và trả về đúng format? |
| Idempotency | Submission/mutation có bị duplicate khi retry không? |

### Lớp 4: Database + Security (Supabase)
Đọc: schema, RLS policies, query patterns

| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| RLS policies | Policy có chặn đúng user không? Có over-restrict không? |
| Query correctness | JOIN, filter có đúng logic không? |
| N+1 queries | Có loop gọi DB không? |
| Index | Query có dùng index không? (dùng `EXPLAIN ANALYZE`) |
| pgvector | HNSW index có build chưa? Threshold cosine hợp lý? |

### Lớp 5: Infrastructure + Queue
Đọc: Redis/BullMQ config, Judge0 integration, Docker setup

| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| Queue health | BullMQ có worker đang chạy không? |
| Job failures | Job có bị stuck ở "waiting" không? |
| Judge0 | Service health endpoint trả gì? |
| Resource limits | Memory/CPU limit cho sandbox đủ chưa? |

### Lớp 6: Cross-cutting Concerns
| Kiểm tra | Câu hỏi cần trả lời |
|---|---|
| Logging | Log có đủ để trace vấn đề không? |
| Environment | `.env` production vs development có khác biệt gì? |
| CORS | Origin whitelist đúng chưa? |
| Secrets | Key đang dùng có đúng environment không? |

---

## Bước A3 — Tổng hợp Root Cause Map

Sau khi audit xong, tổng hợp theo format:

```
## Root Cause Analysis: [Mô tả vấn đề]

### Triệu chứng (Symptom)
[Điều user thấy]

### Root Causes tìm được

| Lớp | File:Line | Vấn đề | Mức độ |
|---|---|---|---|
| Frontend | components/X.tsx:42 | State stale sau submit | 🔴 Critical |
| API Contract | routes/submission.ts:15 | Type mismatch body schema | 🟡 Important |
| Backend | services/submission.ts:88 | Không có timeout cho Judge0 | 🔴 Critical |
| Database | policies/submissions.sql | RLS quá restrictive với worker | 🟡 Important |
| Infrastructure | - | - | ✅ OK |

### Fix thứ tự ưu tiên
1. [Fix lớp gốc nhất trước]
2. [Fix lớp phụ thuộc]
3. [Fix cosmetic / UX cuối]

### Tests cần viết để chứng minh fix (→ Bước TDD)
- [ ] Test A: [prove root cause X đã được fix]
- [ ] Test B: [regression cho lớp liên quan]
```

---

## Bước A4 — Viết failing tests TRƯỚC KHI FIX

Với mỗi root cause tìm được, viết test để REPRODUCE lỗi trước:

```typescript
// Test này phải RED (fail) trước khi fix
it('should NOT timeout when Judge0 takes > 5s', async () => {
  // Arrange: mock Judge0 delay
  mockJudge0.delay(6000)

  // Act + Assert: phải timeout gracefully, không crash
  const result = await submissionService.execute(mockJob)
  expect(result.status).toBe('timeout')
  expect(result.error).toMatch(/execution timeout/)
})
```

Sau đó mới implement fix → chạy lại test → GREEN.

---

# ═══════════════════════════════════════
# CHẾ ĐỘ B: TDD THUẦN
# Khi user muốn viết test cho feature mới
# ═══════════════════════════════════════

## Nguyên tắc TDD trong DevVerse

```
Red → Green → Refactor
(Viết test fail) → (Fix để pass) → (Clean up)
```

**Coverage target: >= 80%** (enforced trong CI qua GitHub Actions)

---

## Bước 1 — Xác định test type cần thiết

| Layer | Test type | Tool | Scope |
|---|---|---|---|
| Service logic | Unit test | `bun:test` | Isolated, mock DB |
| API endpoints | Integration test | `bun:test` + Elysia test client | In-process |
| UI Components | Component test | Vitest + Testing Library | React render |
| User flows | E2E test | Playwright | Full browser |
| RAG pipeline | Eval test | RAGAS framework | AI quality metrics |

---

## Bước 2 — Viết test TRƯỚC khi viết code

```typescript
// Pattern: Arrange → Act → Assert
import { describe, it, expect, beforeEach } from 'bun:test'

describe('[Feature/Service tên]', () => {
  beforeEach(() => {
    // Setup: mock dependencies (Supabase, Judge0, LLM)
  })

  describe('[Function name]', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const input = { /* test data */ }

      // Act
      const result = await myFunction(input)

      // Assert
      expect(result).toEqual({ /* expected output */ })
    })

    it('should throw error when [invalid condition]', async () => {
      expect(() => myFunction(invalidInput)).toThrow('Expected error message')
    })
  })
})
```

---

## Bước 3 — Backend Test (Elysia)

```typescript
import { app } from '../src/app'

describe('POST /api/submissions', () => {
  it('should create submission and enqueue job', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/submissions', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-jwt' },
        body: JSON.stringify({
          problem_id: 'prob-1',
          language: 'python',
          code: 'print("hello")'
        })
      })
    )

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toHaveProperty('submission_id')
  })

  it('should reject unsupported language', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/submissions', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-jwt' },
        body: JSON.stringify({ language: 'brainfuck', code: '+++' })
      })
    )
    expect(response.status).toBe(422)
  })
})
```

---

## Bước 4 — Frontend Test (React Testing Library)

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('QuizQuestion component', () => {
  it('should show correct answer highlight after submission', async () => {
    render(<QuizQuestion question={mockQuestion} onAnswer={mockFn} />)

    await userEvent.click(screen.getByRole('radio', { name: /answer A/i }))
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/correct/i)).toBeInTheDocument()
  })

  it('should disable submit button while loading', async () => {
    // Test loading state — critical for UX
    render(<QuizQuestion question={mockQuestion} onAnswer={slowMockFn} />)
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})
```

---

## Bước 5 — Coverage Check

```bash
bun test --coverage

# Target:
# Statements : >= 80%
# Branches   : >= 80%   ← quan trọng nhất (if/else, error paths)
# Functions  : >= 80%
# Lines      : >= 80%
```

Nếu coverage < 80%:
1. Xem `coverage/index.html` để tìm uncovered paths
2. Ưu tiên cover **error branches** và **edge cases** trước
3. Tuyệt đối không xóa test để tăng % coverage

---

## Bước 6 — RAGAS Eval (cho AI Tutor)

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy

results = evaluate(
    dataset=test_dataset,
    metrics=[faithfulness, answer_relevancy]
)

# Threshold:
# Faithfulness    >= 0.8
# Answer Relevancy >= 0.7
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: bun test --coverage --coverage-threshold 80
```

---

## TDD Checklist

- [ ] Nếu là bug → đã làm Chế độ A (Architecture Debug) trước chưa?
- [ ] Test reproduce bug TRƯỚC khi fix (phải thấy RED)
- [ ] Test cover happy path + error cases + edge cases
- [ ] Mock external dependencies (Supabase, Judge0, LLM API)
- [ ] Không có logic trong test file (chỉ Arrange-Act-Assert)
- [ ] Test chạy nhanh (< 30s cho unit tests)
- [ ] Coverage >= 80% sau khi thêm tests
- [ ] CI xanh sau khi push
