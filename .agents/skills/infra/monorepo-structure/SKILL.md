---
name: monorepo-structure
description: Hướng dẫn cấu trúc monorepo cho DevVerse LMS. Bao gồm workspace layout, shared packages, script conventions, và CI/CD cho monorepo.
---

# Monorepo Structure Skill — DevVerse

## Recommended Layout

```
devverse/                          ← root
├── package.json                   ← workspace root
├── turbo.json                     ← Turborepo config (optional)
├── .github/workflows/             ← CI/CD
├── apps/
│   ├── web/                       ← Frontend (Next.js / React)
│   │   ├── package.json
│   │   ├── src/
│   │   └── ...
│   └── api/                       ← Backend (FastAPI / Node.js)
│       ├── package.json (Node) / pyproject.toml (Python)
│       ├── src/ (hoặc app/)
│       └── ...
├── packages/
│   ├── shared-types/              ← TypeScript types dùng chung (FE + BE)
│   │   ├── package.json
│   │   └── src/index.ts
│   ├── ui/                        ← Shared React components (nếu cần)
│   │   └── ...
│   └── config/                    ← Shared ESLint/TS configs
│       └── ...
├── scripts/                       ← Dev utilities
│   ├── seed-db.ts
│   └── ingest-content.py
└── docs/                          ← Documentation
    └── api.md
```

## 1. Root package.json (npm/bun workspaces)

```json
{
  "name": "devverse",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "web": "cd apps/web && npm run dev",
    "api": "cd apps/api && npm run dev"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

## 2. Shared Types Package

```typescript
// packages/shared-types/src/index.ts
export interface User {
  id: string
  email: string
  role: 'student' | 'instructor' | 'admin'
}

export interface Course {
  id: string
  title: string
  description: string
  instructorId: string
  isPublished: boolean
}

export interface Submission {
  id: string
  userId: string
  problemId: string
  code: string
  languageId: number
  status: SubmissionStatus
}

export type SubmissionStatus =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error'
  | 'error'
```

## 3. CI/CD cho Monorepo

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/**'
            api:
              - 'apps/api/**'
              - 'packages/**'

  test-web:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test --workspace=apps/web
      - run: npm run build --workspace=apps/web

  test-api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r apps/api/requirements.txt
      - run: pytest apps/api/tests --cov=apps/api/app --cov-fail-under=80
```

## Khi nào activate skill này

- Setup project từ đầu
- Add new app hoặc package vào monorepo
- Configure CI để only run affected apps
- Debug monorepo dependency issues
