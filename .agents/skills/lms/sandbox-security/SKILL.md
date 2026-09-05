---
name: sandbox-security
description: Các nguyên tắc bảo mật bắt buộc cho DevVerse sandbox system (5.4). Bao gồm no command injection, resource limits, seccomp, Docker isolation, và fail-safe error reporting.
---

# Sandbox Security Skill — DevVerse (5.4)

## Quy tắc bảo mật bắt buộc

> [!CAUTION]
> Vi phạm bất kỳ quy tắc nào dưới đây có thể dẫn đến Remote Code Execution (RCE) hoặc data breach.

## 1. TUYỆT ĐỐI KHÔNG làm

```python
# ❌ NEVER: exec, eval, os.system với user input
os.system(user_code)
exec(user_code)
eval(user_code)
subprocess.run(user_code, shell=True)  # shell=True là nguy hiểm

# ❌ NEVER: truyền user input trực tiếp vào command
cmd = f"python3 {user_filename}"  # Path traversal risk

# ❌ NEVER: mount host filesystem vào sandbox container
docker run -v /:/host ...  # host compromise
```

## 2. Judge0 = Execution boundary

```
User Code
    ↓ (qua API, KHÔNG chạy trực tiếp)
Judge0 (isolated container)
    ↓ resource limits enforced
Result (stdout/stderr only)
    ↓ (sanitize before returning)
API Response
```

**Tất cả code của user PHẢI đi qua Judge0 API. Không có exception.**

## 3. Input Validation

```typescript
// Server-side validation TRƯỚC khi gửi lên Judge0
function validateCodeSubmission(input: {
  code: string
  languageId: number
  problemId: string
}): void {
  // Size limits
  if (input.code.length > 65536) {
    throw new ValidationError('Code exceeds 64KB limit')
  }
  if (!input.code.trim()) {
    throw new ValidationError('Empty submission')
  }

  // Language ID whitelist
  const ALLOWED_LANGUAGES = [50, 54, 60, 62, 71, 73, 93, 94]
  if (!ALLOWED_LANGUAGES.includes(input.languageId)) {
    throw new ValidationError('Unsupported language')
  }

  // No SQL injection in problemId
  if (!/^[0-9a-f-]{36}$/.test(input.problemId)) {
    throw new ValidationError('Invalid problem ID format')
  }
}
```

## 4. Resource Limits (Judge0 config)

```typescript
const SAFE_LIMITS = {
  cpu_time_limit: 2.0,      // max 2 seconds CPU time
  cpu_extra_time: 0.5,      // grace period
  wall_time_limit: 10.0,    // max 10 seconds wall time
  memory_limit: 262144,     // 256MB in KB
  stack_limit: 65536,       // 64MB stack
  max_file_size: 1024,      // 1MB output max
  number_of_runs: 1,        // single run only
}
```

## 5. Output Sanitization

```typescript
function sanitizeJudgeResult(result: Judge0Result): SafeResult {
  return {
    status: result.status.description,
    time: parseFloat(result.time || '0'),
    memory: result.memory || 0,
    // Truncate stdout/stderr để tránh DoS
    stdout: (result.stdout || '').substring(0, 4096),
    stderr: (result.stderr || '').substring(0, 1024),
    // KHÔNG expose internal paths, tokens, hay system info
    compile_output: (result.compile_output || '').substring(0, 2048),
  }
}
```

## 6. Rate Limiting

```typescript
// Per-user submission rate limit
const RATE_LIMITS = {
  submissionsPerMinute: 10,
  submissionsPerHour: 100,
  concurrentSubmissions: 2
}

// Implement với Redis
import { RateLimiter } from 'limiter'
```

## 7. Fail-safe Error Reporting

```typescript
async function safeJudge0Call(payload: Judge0Submission): Promise<SafeResult> {
  try {
    const result = await judge0.submitAndWait(payload)
    return sanitizeJudgeResult(result)
  } catch (error) {
    // Log internal error (không expose tới user)
    logger.error('Judge0 execution failed', { error, payload: { ...payload, source_code: '[REDACTED]' } })

    // Return safe error to user
    return {
      status: 'Internal Error',
      time: 0,
      memory: 0,
      stdout: null,
      stderr: 'Execution service temporarily unavailable. Please try again.',
      compile_output: null,
    }
  }
}
```

## 8. CORS Config

```typescript
// KHÔNG dùng wildcard trong production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://devverse.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

## Khi nào activate skill này

- Build submission endpoint
- Security review của sandbox system
- Handle error cases trong Judge0 integration
- Setup CORS / rate limiting
- Code review cho bất kỳ code nào chạm vào user-submitted code
