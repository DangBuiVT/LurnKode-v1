# Testing Rules — DevVerse LMS

## Coverage Requirement
- MINIMUM: >=80% line/statement coverage
- CI pipeline FAIL nếu coverage giảm xuống dưới 80%
- Coverage report phải được upload (Codecov / GitHub Actions artifact)

## Test Pyramid
`
E2E:          ~5%  — critical user flows (login, submit code, take quiz)
Integration:  ~25% — API endpoints với test database
Unit:         ~70% — business logic, utilities, grading
`

## Naming Conventions
- Test file: *.test.ts hoặc 	est_*.py
- Test name: describe what it tests, not how
  - ✅ "should return 403 when student accesses admin endpoint"
  - ❌ "test auth middleware"

## Mocking
- Mock external services (Judge0, OpenAI) trong unit tests
- Sử dụng test Supabase project riêng cho integration tests
- KHÔNG mock trong integration tests

## Quality Rules
- Không viết tests chỉ để tăng coverage number
- Mỗi test phải test ONE behavior
- Setup/teardown phải clean database state

## CI Gate
- Pull requests phải pass tất cả tests
- Coverage không được giảm xuống dưới threshold
- Tests phải chạy trong < 5 phút
