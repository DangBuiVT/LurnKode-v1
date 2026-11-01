# LurnKode LMS — Interim Live Verification

**Verification date:** 01/11/2026 (ICT)  
**Source checkout:** `feature/m5-ui`, commit `64eb08497fe9772286568623a84ec3c1b705ca6c`  
**Runtime image caveat:** Docker images are named `lurnkode-api` and `lurnkode-ui`; their creation times are 2026-11-01 10:27:36Z and 10:32:50Z. The container images are not traceably tied to the checkout SHA. Screenshots show data that differs from live API output, so runtime UI is not confirmed to match this source commit.

## Summary

The running Docker stack was verified through Docker context `desktop-linux`: PostgreSQL, Redis, API, and UI report running. The API responds successfully and a synthetic learner can register, authenticate, retrieve an empty enrollment list, and is denied instructor-only course creation. PostgreSQL reports 11 public tables and a successful migration log; Redis returns `PONG`.

The live API catalog returns zero courses, while the UI screenshot displays numerous sample courses. The UI screenshot is therefore not evidence of API-backed catalog data. Instructor/student end-to-end CRUD and learning progression were not run because there is no confirmed instructor test account and the database `lurnkode_db` is not identified as an isolated test database. The M2 integration test contains destructive cleanup, so it was deliberately not executed.

**Demo readiness: Partially ready for a controlled API/health demo; not ready to claim verified LMS end-to-end integration.**

## 1. Environment and services

| Item | Observed result |
|---|---|
| Source commit | `64eb08497fe9772286568623a84ec3c1b705ca6c` |
| Docker Engine | Client/server `29.8.1`; context `desktop-linux` |
| API container | `lurnkode-api`, running, host port 8000 |
| Database | `lurnkode-postgres`, running, host port 5432; PostgreSQL 16.15 |
| Redis | `lurnkode-redis`, running, host port 6379; `redis-cli ping` → `PONG` |
| UI | `lurnkode-ui`, running; host port **3001** → container 3000 |
| Database | `lurnkode_db`; 11 public tables; 0 courses at inspection; 1 `INTERIM-TEST` learner created during this verification |
| Persistent data | Postgres uses a named volume mounted at `/var/lib/postgresql/data`; no volume or existing data was removed |
| pgvector | Query for extension `vector` returned no row |
| RLS | 0 of 11 public tables have row-level security enabled |

The Windows sandbox initially could not read Docker context metadata. Read-only Docker inspection was then run with elevated access; no containers were restarted. `docker compose ps` showed all four services running. UI responds on port 3001 as configured by root Compose; port 3000 on the Windows host is not published.

## 2. HTTP/API verification

| Request | Result | Evidence |
|---|---:|---|
| `GET http://localhost:8000/health` | 200 | `{"status":"ok"}` |
| `GET http://localhost:8000/docs` | 200 | Swagger HTML, 4543 bytes |
| `GET http://localhost:8000/api/v1/m2/status` | 200 | `ready: true` |
| `GET http://localhost:8000/api/v1/courses` | 200 | Empty catalog; pagination metadata present |
| `GET http://localhost:3001/course/catalog` | 200 | HTML, 50760 bytes |
| `GET http://localhost:3001/studio/courses` | 200 | HTML, 68119 bytes; direct HTTP 200 does not prove role authorization |
| `GET http://localhost:3001/` | 307 | Redirect response |

### Authenticated checks using a synthetic test learner

A new account named `INTERIM-TEST Learner` was registered using a random `interim-test-…@example.invalid` address. The password and JWT were held only in process memory and are not included here. The account was left in the database; it was not deleted. Database count after registration: one matching `INTERIM-TEST` account.

| Request | Result |
|---|---:|
| `POST /api/v1/auth/register` | 201, role `Learner` |
| `GET /api/v1/my/enrollments` with test token | 200, count 0 |
| `GET /api/v1/my/enrollments` without token | 401 |
| `POST /api/v1/courses` as Learner | 403 |
| `GET /api/v1/lessons/{valid-random-UUID}/access` | 404 (resource does not exist) |
| `GET /api/v1/notifications` with test token | 200, count 0 |
| `GET /api/v1/lessons/{valid-random-UUID}/discussions` | 404 (lesson does not exist) |
| `GET /api/v1/courses/{valid-random-UUID}` | 404 (course does not exist) |

Five demo login candidates declared in the UI were tried with the UI’s documented demo password; each returned 401. No Instructor/Admin account was available for an authorized instructor flow. No course or lesson was created.

## 3. Test/build/typecheck/lint

Dependencies were not reinstalled and lockfiles were not changed. Commands were run against the Windows checkout; missing dependencies prevented most checks from loading.

| Command | Result |
|---|---|
| `bun test` in `apps/api` | **FAIL** — 60 passed, 75 todo, 9 failed/errors. Import/load errors include missing `elysia`, `drizzle-orm`, `jose`, `@elysiajs/cors`, and `@sinclair/typebox/value`. M2 integration test did not load successfully. |
| `bun test tests/unit/utils tests/unit/schemas` in `apps/api` | **FAIL (partial)** — 60 utility tests passed; schema test failed to load because TypeBox package is missing. |
| `bun run build` in `apps/api` | **FAIL** — unresolved API dependencies (`elysia`, plugins, `drizzle-orm`, `pg`). |
| `bun run typecheck` in `apps/api` | **FAIL** — TypeScript cannot find `bun-types`. |
| `npm run build` in `apps/web/lurnkode-ui` | **FAIL** — `next` is not recognized (frontend dependencies absent). |
| `npm run lint` in `apps/web/lurnkode-ui` | **FAIL** — `eslint` is not recognized. |
| M2 integration test | **NOT RUN / BLOCKED** — database name is `lurnkode_db`, not confirmed test-only; test suite cleans up created courses/users. Safety rule prohibits running it against an unisolated database. |

Additional checks in the running API image (`lurnkode-api`, source SHA not embedded/verified): `bun run typecheck` **PASS** and `bun run build` **PASS** (622 modules bundled). `bun test tests/unit` found no test files because the image does not package the repository's `tests/` directory; this is **NOT TESTED**, not a pass. These image-level checks cannot be attributed to the checkout SHA.

Docker API logs show Drizzle migration startup reporting “migrations applied successfully” and the API starting on port 8000. UI logs show Next.js 16.4.3 ready on container port 3000. These logs establish service startup, not successful application flows.

## 4. LMS flow matrix

| Flow / feature | Status | Verification result |
|---|---|---|
| Docker DB/Redis/API/UI health | **PASS** | Compose containers running; API health/status and Redis ping passed |
| Swagger `/docs` | **PASS** | HTTP 200, Swagger HTML returned |
| Student catalog API | **PASS (empty)** | API returned 200 with 0 courses |
| Student catalog UI | **FAIL (integration evidence)** | Screenshot shows sample courses while API catalog is empty; runtime UI data does not match live API response |
| Learner registration | **PASS** | Synthetic `INTERIM-TEST` learner received 201 |
| Learner My Courses API | **PASS (empty)** | Authenticated request returned 200 with 0 enrollments |
| Unauthorized enrollment-list access | **PASS** | Missing token returned 401 |
| Learner attempting instructor course create | **PASS (denied)** | Returned 403 |
| Instructor view/create/edit/publish course | **BLOCKED** | No valid Instructor test account; no test course created |
| Chapter/Lesson/Material create/edit | **BLOCKED** | Depends on instructor flow; not performed |
| Student course detail/enroll/leave/re-enroll | **BLOCKED** | Catalog has no courses; no test course was seeded |
| Lesson material/access/complete | **BLOCKED** | No valid lesson/course; only random-ID 404 checked |
| Sequential learning restriction/progress | **BLOCKED** | Requires test course/lessons; destructive M2 suite was not run |
| Discussion API | **PARTIAL** | Authenticated unknown-lesson request correctly returned 404; create/list/reply was not exercised |
| Notifications API | **PARTIAL** | Authenticated list returned 200 and zero records; notification generation/read not exercised |
| Discussion UI integration | **FAIL (source review)** | UI discussion component uses local state/sample comments and does not call `interactionsApi` |
| Notification UI integration | **FAIL (source review)** | Header bell is present, but no use of `interactionsApi` found in UI components/pages |
| Quiz UI | **FAIL (not integrated)** | Learner and instructor quiz components/pages use `mockDb` |

## 5. Screenshots and log evidence

Screenshots were captured from the live UI using headless Chrome. They are genuine runtime captures, but should be labeled as unauthenticated/mock-data views:

- [Student catalog](interim-live-evidence/student-catalog.png) — sample cards and demo identity visible, inconsistent with API’s empty catalog.
- [Studio route without authentication](interim-live-evidence/instructor-studio-route.png) — sample instructor cards visible; this does not demonstrate an authenticated instructor session or permission enforcement.

No screenshot of a successful course mutation or student lesson flow exists because no Instructor account/course was available. Browser GPU sandbox errors occurred in the initial screenshot attempt; Chrome headless succeeded with adjusted flags.

Sanitized request/response summary and service startup evidence are also recorded in [runtime-checks.md](interim-live-evidence/runtime-checks.md). Sensitive values (tokens, passwords, keys, DB URL) are omitted.

## 6. Security and deployment findings

- **JWT/auth:** live login against demo candidates returned 401; synthetic Learner registration and authenticated routes succeeded. A missing-token request returned 401. No JWT was output or persisted.
- **RBAC:** Learner course creation returned 403. Instructor/Admin privileges and ownership enforcement were not fully verified without an Instructor account and test course.
- **UI authorization:** unauthenticated HTTP request to `/studio/courses` returned 200 and screenshot rendered sample course content. Source has client-side redirect logic, but server/API authorization is the security boundary; verify protected API endpoints directly and avoid treating this UI route response as proof of authorization.
- **Secrets:** root `docker-compose.yml` contains fixed credentials/service keys and an encoded JWT private key. Values are intentionally not reproduced. Treat these as development-only and rotate/remove before any shared deployment.
- **Database:** persistent named volume confirmed. PostgreSQL 16.15 is reachable through API and Docker exec. RLS is disabled on all 11 public tables. Database is not confirmed isolated; no destructive test ran.
- **Deployment/runtime reproducibility:** containers are running, but image metadata does not bind them to source commit. UI/API image timestamps are recorded above; UI data mismatch reinforces that runtime may be stale or using mock data.
- **Compose port mapping:** host UI port is 3001, not 3000; API is host port 8000.

## 7. Remaining work before Final Report

1. Provide a dedicated disposable test database (or backup/restore workflow) and run M1/M2 integration tests there; preserve logs and exit status.
2. Supply a valid Instructor test account through a safe channel. Then verify course ownership, CRUD, publish, student enrollment, sequential access, completion/progress and leave/re-enroll with `INTERIM-TEST` data.
3. Rebuild/redeploy the UI from the chosen commit and verify that catalog/studio show API data rather than sample cards. Record image digest and source SHA together.
4. Add evidence for Discussion creation/reply/notification generation/read and wire UI to interaction APIs if required by the agreed scope.
5. Remove remaining `mockDb` use from quiz only if quiz is within the current milestone; for this LMS-only interim, mark it explicitly out of verified integration.
6. Restore dependencies in a permitted environment, rerun API test/build/typecheck and frontend build/lint; attach complete outputs.
7. Replace committed fixed secrets, verify JWT rotation/ownership rules, and decide/implement RLS policy requirements before shared deployment.
8. Align setup docs with Compose ports and current repository paths.

## Evidence classification

- **Source implemented:** route/service/UI code exists; not equivalent to runtime proof.
- **Runtime observed:** HTTP/Docker/API request results recorded in this report.
- **Test passed:** only the explicitly noted 60 utility tests and API checks.
- **End-to-end LMS:** not established. The available environment proves service startup and selected auth/API behavior, not a completed instructor-to-student learning journey.
