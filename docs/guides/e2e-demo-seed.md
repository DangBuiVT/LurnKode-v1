# LurnKode E2E/demo seed

This seed creates only the local E2E accounts and LMS records described below. It never resets a database, deletes records, or writes directly to application tables. User and LMS records are created through the existing M1/M2 APIs, so M1 remains responsible for password hashing and role assignment.

## Safety and prerequisites

- Use the repository's local Docker Compose project with Docker context `desktop-linux`, project `lurnkode`, working directory `D:\LurnKode`, PostgreSQL service `lurnkode-postgres`, and named volume `lurnkode_postgres_data`.
- The target must be the local database `lurnkode_db` on `localhost:5432` and local API `http://localhost:8000`. The script checks these values, the Compose labels and volume, and requires explicit `DEMO_SEED_CONFIRM_DB=lurnkode_db`.
- The demo seed requires an active M1 Admin. If no Admin exists, first use the one-time local bootstrap below. The API image must serve the current M1/M2 routes.
- The PostgreSQL connection used for verification sets transaction read-only mode. The seed's data writes use API calls.
- Do not point these commands at a shared, staging, or production database. No database reset or Docker volume operation is part of this procedure.

## Start/confirm local services

From the repository root, inspect before starting anything:

```powershell
docker context show
docker compose ps
```

If the services are stopped, start only the dependencies and app services:

```powershell
docker compose up -d postgres redis api web
```

Set the variables in the current PowerShell session without printing `DATABASE_URL` (Compose may render credentials):

```powershell
$compose = docker compose config --format json | ConvertFrom-Json
$dbUrl = [string]$compose.services.api.environment.DATABASE_URL
$env:DATABASE_URL = $dbUrl.Replace('@postgres:', '@localhost:')
$env:API_BASE_URL = 'http://localhost:8000'
$env:DEMO_SEED_CONFIRM_DB = 'lurnkode_db'
```

Run a read-only preflight first:

```powershell
cd apps/api
bun run db:seed:demo -- --dry-run
```

The dry run prints only database identity and account/course counts, plus whether an active Admin exists. Do not proceed if any target or the API is not the expected local service.

## Create the first local Admin (only if none exists)

The M1 bootstrap CLI is a one-time, operator-run command. It does not run on API startup or expose a public endpoint. It accepts only database `lurnkode_db` on a local host or the explicitly confirmed local Compose project; `NODE_ENV` alone is not used as an environment check. It refuses if any Admin row exists, including a locked account.

Ensure `apps/api/.env` points to this workspace's host-published PostgreSQL service through `localhost` and port `5432`. Before prompting for any account data, the CLI verifies the local Docker context, Compose project/workspace labels, PostgreSQL service, existing named volume, configured DB name and published port. It refuses if Docker is unavailable or the service metadata differs. From `apps/api`, run:

```powershell
bun --env-file=.env run scripts/bootstrap-admin.ts --confirm-local-dev
```

The CLI asks you to type `BOOTSTRAP FIRST ADMIN`, then prompts for the email, name, and password. Password input is hidden and must be entered in an interactive terminal; it cannot be supplied as an argument. Use a unique password managed by the team. The password is hashed by M1 with Argon2id and is not printed or saved. The command does not modify an existing account.

The CLI accepts loopback DB hosts (`localhost`, `127.0.0.1`, or `::1`) only. It does not accept Compose DNS names or remote Docker contexts; use the host-published port from an interactive terminal.

Verify login locally without printing or persisting the access token:

```powershell
$email = Read-Host 'Admin email'
$securePassword = Read-Host 'Admin password' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
$body = @{ email = $email; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/v1/auth/login' -ContentType 'application/json' -Body $body
if ($login.data.user.role -ne 'Admin') { throw 'M1 login did not return the Admin role.' }
'M1 Admin login verified.'
Remove-Variable body, login, password, securePassword
```

If an Admin already exists, bootstrap stops. Sign in with that account and use normal M1 user management. If only a locked/inactive Admin exists and its credentials are unavailable, use the team's approved account recovery procedure; do not rerun bootstrap, promote a user through SQL, or edit the role directly.

## Execute using an existing M1 Admin

Supply the email and password of an existing active M1 Admin only in the local shell environment. Do not paste them into source files, command history, or report evidence. For example, use secure prompts in PowerShell:

```powershell
$env:DEMO_SEED_ADMIN_EMAIL = Read-Host 'Existing local M1 Admin email'
$securePassword = Read-Host 'Existing local M1 Admin password' -AsSecureString
$env:DEMO_SEED_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
bun run db:seed:demo
Remove-Item Env:DEMO_SEED_ADMIN_EMAIL, Env:DEMO_SEED_ADMIN_PASSWORD
```

On successful first run, the script creates an ignored local file `apps/api/.env.demo-accounts`. It contains generated demo passwords; keep it local and share the credentials with the team through the approved private channel. The script never prints passwords. The file is created only if Git confirms it is ignored and no target accounts already exist. If demo users exist but that credentials file is missing, the seed stops instead of resetting passwords.

## Seed records

| Account | Role | Email |
| --- | --- | --- |
| E2E demo instructor 1 | Instructor | `e2e-instructor1@lurnkode.test` |
| E2E demo instructor 2 | Instructor | `e2e-instructor2@lurnkode.test` |
| E2E demo learner | Learner | `e2e-learner@lurnkode.test` |

| Course | Owner | Status | Contents |
| --- | --- | --- | --- |
| Introduction to Programming | Instructor 1 | Published | 2 chapters, 4 lessons; Markdown (one RAG source), Video and Slide materials; learner enrollment; discussions/replies; notifications; first lesson completed |
| Database Fundamentals | Instructor 1 | Draft | Course shell |
| Web Development Fundamentals | Instructor 2 | Published | Course shell |

The learner's initial progress is one of four lessons (25%); the third lesson should remain blocked until its prerequisite is completed. The seed validates instructor ownership lists, public published catalog visibility, learner enrollment, notification read/unread state, and Argon2id passwords using Bun's password verifier without printing password hashes.

## Repeat runs and verification

Run the same command again with the same target guard and local credentials. Existing demo accounts, courses, curriculum, enrollment, discussions and replies are matched by stable emails, titles/order, or `[E2E-DEMO-SEED]` text. Missing records are added. Existing records with conflicting ownership or content cause a safe stop. Nothing is deleted and passwords are never replaced.

The success output includes API/DB verification counts but no tokens, passwords, or hashes. Capture that output for the Interim Report only after a successful run. To sign in, read the ignored `apps/api/.env.demo-accounts` file locally; do not commit or attach it to public evidence.

## Current environment prerequisite

The environment inspected before this CLI was implemented had no Admin and no demo records. The bootstrap and seed commands have not been run on that database. An operator must run the one-time CLI manually before the E2E demo seed can create accounts and LMS records.
