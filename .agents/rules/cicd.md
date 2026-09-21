# CI/CD Rules — LurnKode LMS

## GitHub Actions Pipeline

### On Push / PR:
1. Lint (ESLint / Ruff)
2. TypeCheck (`tsc --noEmit`)
3. Tests (với coverage gate >= 80%)
4. Build (verify không có build errors)

### On Merge to main:
1. Build Docker image
2. Deploy theo strategy đã cấu hình (Docker + CI/CD)

## Branch Strategy
- `main` — production
- `dev` — integration branch
- `feat/xxx` — feature branches
- PRs từ `feature` → `dev` (reviewer required)
- Merge `dev` → `main` khi stable

## Environment Variables
- development: `.env.local`
- staging: GitHub Actions secrets (`DEV_*`)
- production: GitHub Actions secrets (`PROD_*`)

## Deployment
- Deployment target: **Docker containers**
- Judge Worker chạy như container riêng biệt
- Docker Sandbox không chạy chung với API process

## Release
- Semantic versioning: `MAJOR.MINOR.PATCH`
- Tag release sau mỗi milestone
- `CHANGELOG.md` update với mỗi release

## Deployment Checklist
- [ ] Tests pass
- [ ] Coverage >= 80%
- [ ] TypeCheck pass
- [ ] Build pass
- [ ] Environment variables configured
- [ ] Database migrations (Drizzle) applied
