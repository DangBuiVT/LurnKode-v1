# CI/CD Rules — DevVerse LMS

## GitHub Actions Pipeline

### On Push / PR:
1. Lint (ESLint / Ruff)
2. TypeCheck (tsc --noEmit)
3. Tests (với coverage gate >=80%)
4. Build (verify không có build errors)

### On Merge to main:
1. Deploy frontend → Vercel/Netlify (auto)
2. Deploy backend → Railway/Render (auto)

## Branch Strategy
- main — production
- dev — integration branch
- eature/xxx — feature branches
- PRs từ feature → dev (reviewer required)
- Merge dev → main khi stable

## Environment Variables
- development: .env.local
- staging: GitHub Actions secrets (DEV_*)
- production: GitHub Actions secrets (PROD_*)

## Release
- Semantic versioning: MAJOR.MINOR.PATCH
- Tag release sau mỗi milestone
- CHANGELOG.md update với mỗi release

## Deployment Checklist
- [ ] Tests pass
- [ ] Coverage >= 80%
- [ ] TypeCheck pass
- [ ] Build pass
- [ ] Environment variables configured
- [ ] Database migrations applied
