---
name: coverage-80
description: Hướng dẫn enforce >=80% test coverage trong DevVerse CI pipeline (GitHub Actions). Bao gồm coverage thresholds, CI gate setup, reporting, và exemption patterns.
---

# Coverage 80% Skill — DevVerse CI Quality Gate

## Yêu cầu đề bài: >=80% automated test coverage

## 1. Python (pytest + coverage)

```bash
# Install
pip install pytest pytest-cov pytest-asyncio

# Run với coverage
pytest --cov=app --cov-report=term-missing --cov-fail-under=80

# HTML report (cho review)
pytest --cov=app --cov-report=html:htmlcov
```

```ini
# pytest.ini hoặc pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.coverage.run]
source = ["app"]
omit = ["app/migrations/*", "app/tests/*", "*/__init__.py"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

## 2. Node.js/TypeScript (Vitest hoặc Jest)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,   // Branches đôi khi khó đạt 80%
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/migrations/**',
      ]
    }
  }
})
```

## 3. GitHub Actions Gate

```yaml
# .github/workflows/test.yml
name: Tests & Coverage
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests with coverage
        run: pytest --cov=app --cov-report=xml --cov-fail-under=80

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          fail_ci_if_error: true   # ← CI fails if coverage drops

      - name: Coverage badge
        run: |
          COVERAGE=$(python -m pytest --cov=app --cov-report=term | grep TOTAL | awk '{print $4}')
          echo "Coverage: $COVERAGE"
```

## 4. What to test (priority order)

```
1. Business logic (judge, quiz grading, RBAC) ← MOST IMPORTANT
2. API endpoints (happy path + error cases)
3. Database operations (with test DB)
4. Utility functions
5. Auth middleware

SKIP:
- Generated code (migrations)
- Third-party integrations (mock them)
- Simple config files
```

## Khi nào activate skill này

- Setup test environment từ đầu
- Add coverage gate vào GitHub Actions
- Debug failing coverage threshold
- Review test quality (not just quantity)
