# M1 first Admin bootstrap (local development)

This CLI provisions exactly one first Admin for the local LurnKode development database. It is an explicit operator command; API startup and public registration do not invoke it.

## Preconditions

- Start this repository's local Docker Compose services and confirm the PostgreSQL service is healthy.
- Configure `apps/api/.env` with the host-published DB URL for `lurnkode_db` on `localhost:5432`.
- Run from an interactive terminal in `apps/api` with Bun and Docker CLI available.
- The CLI verifies a local Docker context, the `lurnkode` Compose project and workspace, the `postgres` service, its existing `lurnkode_postgres_data` volume, configured DB name, and published port. It rejects remote hosts, other database names, remote Docker contexts, and mismatched Compose metadata. `NODE_ENV` is not used as the environment safeguard.
- The CLI never resets or deletes a database or volume. It refuses if any Admin row exists, whether active or locked.

## Bootstrap the first Admin

From `apps/api`:

```powershell
bun --env-file=.env run scripts/bootstrap-admin.ts --confirm-local-dev
```

Type `BOOTSTRAP FIRST ADMIN` when asked. Then enter the Admin email and full name. Enter the password at the hidden prompt; it must be 8–128 characters. The password is not accepted as an argument, printed, or saved. M1 hashes it using the existing Argon2id helper.

The bootstrap transaction obtains PostgreSQL advisory lock `641907321`, checks for any Admin role, and inserts the initial Admin only if none exists. A second or concurrent attempt is rejected. Database errors are reported without SQL parameters or password hashes.

## Verify login through M1

With the API running locally, verify credentials through the normal login route. This PowerShell example captures the response so the access token is not printed:

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

## Continue with E2E Demo Seed

After successful login, follow [E2E demo seed instructions](./e2e-demo-seed.md). The seed uses this Admin session through M1 APIs to create Instructor and Learner accounts; it does not bootstrap or promote Admins itself.

## If an Admin already exists

Bootstrap will refuse to run. Sign in with the existing active Admin and use M1 user management. If only an inactive/locked Admin exists and its credentials are unavailable, follow the team's approved account recovery process. Do not promote another account through SQL or rerun bootstrap.
