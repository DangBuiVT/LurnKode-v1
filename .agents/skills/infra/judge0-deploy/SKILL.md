---
name: judge0-deploy
description: Hướng dẫn self-host Judge0 lên Railway/Render free tier cho DevVerse sandbox. Bao gồm Docker Compose setup, environment variables, sleep workaround, và monitoring.
---

# Judge0 Self-host Deployment Skill — DevVerse

## Deploy lên Railway (Recommended)

### 1. Fork hoặc dùng Docker Compose

```yaml
# docker-compose.yml (từ Judge0 official)
version: '3'
services:
  server:
    image: judge0/judge0:1.13.1
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    ports:
      - "2358:2358"
    privileged: true
    restart: always
    depends_on:
      - db
      - redis

  workers:
    image: judge0/judge0:1.13.1
    command: ["./scripts/workers"]
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    privileged: true
    restart: always
    depends_on:
      - db
      - redis

  db:
    image: postgres:16.2
    env_file: judge0.conf
    restart: always

  redis:
    image: redis:7.2.4
    restart: always
```

### 2. judge0.conf

```ini
# judge0.conf
POSTGRES_DB=judge0
POSTGRES_USER=judge0
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgres://judge0:your_secure_password@db/judge0

REDIS_URL=redis://redis:6379

# Security: Enable auth token
AUTHN_HEADER=X-Auth-Token
AUTHN_TOKEN=your_secret_api_token_here

# Resource limits
MAX_CPU_TIME_LIMIT=15
MAX_MEMORY_LIMIT=512000

# Workers
WORKERS_COUNT=4
```

### 3. Deploy trên Railway

```bash
# Option A: Deploy via CLI
railway login
railway init
railway up

# Option B: Connect Railway to GitHub repo với docker-compose.yml
# Railway sẽ auto-detect và deploy
```

### 4. Workaround Railway free tier sleep (spin-down sau 5 phút)

```typescript
// Ping service mỗi 4 phút để tránh sleep
// Thêm vào background job hoặc cron

const JUDGE0_URL = process.env.JUDGE0_URL!

async function keepJudge0Alive() {
  try {
    await fetch(`${JUDGE0_URL}/languages`, {
      headers: { 'X-Auth-Token': process.env.JUDGE0_AUTH! }
    })
  } catch {
    // Ignore errors — service might be waking up
  }
}

// Run every 4 minutes
setInterval(keepJudge0Alive, 4 * 60 * 1000)
```

### 5. Render.com Alternative

```yaml
# render.yaml
services:
  - type: web
    name: judge0-server
    env: docker
    dockerfilePath: ./Dockerfile
    plan: free
    envVars:
      - key: JUDGE0_AUTHN_TOKEN
        generateValue: true
```

## 6. Health Check

```typescript
async function checkJudge0Health(): Promise<boolean> {
  try {
    const response = await fetch(`${JUDGE0_URL}/system_info`, {
      headers: { 'X-Auth-Token': process.env.JUDGE0_AUTH! },
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}
```

## 7. Test Deployment

```bash
# Test basic submission
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: your_token" \
  -d '{"source_code": "cHJpbnQoJ0hlbGxvJyk=", "language_id": 71}' \
  https://your-judge0.railway.app/submissions?base64_encoded=true&wait=true
```

## Khi nào activate skill này

- First-time Judge0 deployment
- Debug Judge0 connectivity issues
- Scale worker count
- Setup monitoring/alerting
- Migrate to different hosting
