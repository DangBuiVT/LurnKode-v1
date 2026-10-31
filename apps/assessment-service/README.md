# LurnKode – Assessment Microservice (M3)

Autonomous Assessment Microservice for the **LurnKode** AI-Assisted Learning Platform (CO3103).  
Responsible for assessment authoring, question banking, synchronous MCQ grading, asynchronous programming submission dispatching to the M6 Judge Worker, and domain event publishing.

---

## 🏗️ Architecture Overview

The Assessment Service runs as an independent, containerized service adopting the **Database-per-Service** pattern:
- **Runtime:** TypeScript on [Bun](https://bun.com)
- **Framework:** ElysiaJS REST API
- **Database:** Dedicated PostgreSQL instance (managed via Drizzle ORM)
- **Task Queue:** Redis + BullMQ (Producer for M6 Judge jobs)
- **Domain Events:** Emits `assessment.attempt.completed` events for M2 (Course Gradebook) & M4 (AI Tutor)
- **Inter-Service Client:** Resilient HTTP RPC client for M2 Course Enrollment checks

```
  API Gateway (M1) ──► Assessment Service (M3) ──► Dedicated PostgreSQL
                             │
                             ├──► M2 Course Service (Enrollment RPC)
                             ├──► Redis / BullMQ ──► M6 Judge Worker
                             └──► Publishes Domain Events (M2 & M4)
```

---

## 📁 Directory Structure

```
.
├── Dockerfile                         # Multi-stage production & dev Docker container
├── docker-compose.yml                 # Local multi-container setup (Service + Postgres + Redis)
├── package.json                       # Service dependencies and runner scripts
├── m3_assessment_module_tech_stack_data_flow_specification.md  # Architectural specification
├── scripts/
│   ├── fake-judge.ts                  # Mock judge worker simulating M6 callbacks
│   └── seed-assessment.ts             # Local database seeder
└── src/
    ├── config/                        # Environment config and Zod validation
    ├── db/                            # Dedicated Drizzle PostgreSQL schema & connection
    ├── clients/                       # Inter-service RPC client for M2 Course Service
    ├── events/                        # Domain event definitions and publisher
    ├── middlewares/                   # Gateway header identity extractor & error handling
    ├── routes/                        # Elysia route controllers (Health, Instructor, Learner, Internal)
    ├── services/                      # Business logic, pure grading engines, queue & callback services
    ├── repositories/                  # Drizzle repository operations
    ├── schemas/                       # Domain types and Zod contract schemas
    ├── mappers/                       # Safe data mappers (sanitizing learner-visible payloads)
    ├── tests/                         # Unit tests (grading math) and integration tests
    └── index.ts                       # Service bootstrap & port listener
```

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.com) v1.2+
- Docker & Docker Compose (optional for local containerized environment)

### Installation
```bash
bun install
```

### Running Tests
```bash
bun test
```

### Local Development
```bash
# Start standalone dev server with live reload:
bun run dev

# Or spin up full containerized stack (Service + Dedicated Postgres + Redis):
docker compose up -d
```

### Seeding Test Data
```bash
bun run seed
```

### Authentication

Public routes expect identity to be injected by the M1 API Gateway. For local
calls, pass the same headers directly:

```bash
# Instructor routes
-H "X-User-Id: instructor-1" -H "X-User-Role: instructor"

# Learner routes
-H "X-User-Id: learner-1" -H "X-User-Role: learner"

# Internal judge callback (M6)
-H "X-Internal-Token: $INTERNAL_SERVICE_TOKEN"
```

Requests without an identity now fail with `401`; a valid identity with the
wrong role fails with `403`. There is no development-user fallback.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/live` | Service liveness probe |
| `GET` | `/health/ready` | Service readiness probe (checks DB & Redis) |
| `POST` | `/instructor/assessments` | Create assessment (Draft) |
| `POST` | `/instructor/assessments/:id/items` | Add MCQ or Programming question |
| `POST` | `/instructor/assessments/:id/publish` | Publish assessment |
| `POST` | `/learner/assessments/:id/attempts` | Start attempt (queries M2 for enrollment) |
| `POST` | `/learner/attempts/:attemptId/answers` | Submit synchronous MCQ answer |
| `POST` | `/learner/attempts/:attemptId/code-submissions`| Submit code for async judge evaluation |
| `POST` | `/learner/attempts/:attemptId/finish` | Finish attempt (`grading` if judge jobs pending, otherwise `completed` + event) |
| `POST` | `/internal/judge/callback` | Authenticated callback from M6 Judge Worker |
