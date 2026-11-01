# Sanitized runtime evidence

Captured 01/11/2026 (ICT), source checkout SHA `64eb08497fe9772286568623a84ec3c1b705ca6c`.

## Docker

Read-only commands used: `docker --context desktop-linux compose ps`, `docker --context desktop-linux version`, `docker inspect`, `docker logs`.

```text
Docker client/server: 29.8.1 / 29.8.1
lurnkode-api       api       running   host 8000 -> container 8000
lurnkode-postgres  postgres  running   host 5432 -> container 5432
lurnkode-redis     redis     running   host 6379 -> container 6379
lurnkode-ui        ui        running   host 3001 -> container 3000
```

Postgres inspection (read-only): PostgreSQL 16.15; current DB `lurnkode_db`; 11 public tables; 0 courses; one `INTERIM-TEST` user. No table had RLS enabled. Query for extension `vector` returned no row. Redis `PING` returned `PONG`. Postgres has a named persistent volume.

Sanitized API log excerpt:

```text
Drizzle migration startup: migrations applied successfully
API server started, port 8000, environment production
```

Sanitized UI log excerpt:

```text
Next.js 16.4.3
Local http://localhost:3000 (container)
Ready
```

## HTTP requests

```text
GET /health                         -> 200 {"status":"ok"}
GET /docs                           -> 200 text/html; 4543 bytes
GET /api/v1/m2/status               -> 200 {"success":true,"data":{"module":"M2 Learning Management","ready":true}}
GET /api/v1/courses                 -> 200 {"success":true,"data":[],"meta":{"page":1,"limit":20,"totalItems":0,"totalPages":0,"total":0}}
GET /course/catalog (host :3001)    -> 200 HTML; screenshot displays sample courses
GET /studio/courses (host :3001)    -> 200 HTML; unauthenticated screenshot displays sample courses
POST /api/v1/auth/register          -> 201; role Learner; synthetic INTERIM-TEST email
GET /api/v1/my/enrollments          -> 200; empty array
GET /api/v1/my/enrollments (no auth)-> 401
POST /api/v1/courses (as Learner)   -> 403
GET /api/v1/lessons/{random UUID}/access -> 404
GET /api/v1/notifications           -> 200; empty array
GET /api/v1/lessons/{random UUID}/discussions -> 404
GET /api/v1/courses/{random UUID}   -> 404
```

Test token and password remained in process memory and were not saved. Account was retained; no cleanup/delete request was issued.

## Quality commands

```text
Windows checkout: bun test -> 60 pass, 75 todo, 9 fail/error (missing dependencies)
Windows checkout: bun run typecheck -> FAIL, missing bun-types
Windows checkout: bun run build -> FAIL, dependencies not resolved
Windows checkout: npm run build -> FAIL, next not recognized
Windows checkout: npm run lint -> FAIL, eslint not recognized
API image: bun run typecheck -> PASS
API image: bun run build -> PASS, 622 modules bundled
API image: bun test tests/unit -> no test files packaged; not tested
```

The API image has no verified source SHA, so its build/typecheck result is image-specific and must not be represented as a pass for the checkout.
