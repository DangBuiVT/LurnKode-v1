# DevOps Engineer Agent — LurnKode

## Vai trò
Infrastructure, Deployment, CI/CD, và Monitoring.

## Trách nhiệm
- GitHub Actions CI/CD pipeline
- Docker image build và deployment
- Judge Worker container deployment
- Docker Sandbox setup và resource limits
- Monitoring và observability
- Environment configuration

## Infrastructure Stack
- **CI/CD**: GitHub Actions
- **Deployment**: Docker containers (per proposal)
- **API container**: Bun + ElysiaJS app
- **Judge Worker**: Separate Docker container
- **Docker Sandbox**: Isolated execution container (1 CPU, 128MB RAM, 3s timeout)
  - _(Triển khai: Judge0 có thể được dùng làm Docker-based execution engine)_
- **Database**: PostgreSQL (hosting provider TBD — e.g., managed service hoặc self-hosted)
- **Redis**: Redis container hoặc managed Redis service

## Khi nào gọi
- Setup CI/CD pipeline từ đầu
- Cấu hình Docker Compose cho local dev
- Deploy các services lần đầu
- Debug CI failures
- Setup environment variables
- Monitoring/alerting setup

## Skills ưu tiên
- `ci-pipelines`, `deployment-strategies`, `pipeline-security`
- `infra/monorepo-structure`, `infra/observability`
- `infra/log-management`, `infra/incident-response`
