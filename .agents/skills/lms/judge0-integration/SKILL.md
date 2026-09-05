---
name: judge0-integration
description: Hướng dẫn tích hợp Judge0 code execution engine vào DevVerse LMS. Bao gồm submission lifecycle, language IDs, test-case runner, timeout handling, fail-safe error reporting, và self-host deployment.
---

# Judge0 Integration Skill — DevVerse Sandbox

## Judge0 là gì?

Judge0 là open-source code execution engine (Apache 2.0).
DevVerse dùng Judge0 self-hosted để:
- Chạy code trong isolated container
- Enforce CPU/memory limits
- Support 60+ ngôn ngữ lập trình
- Return stdout/stderr/time/memory

## 1. Language IDs (phổ biến nhất)

```typescript
export const LANGUAGE_IDS = {
  python3:    71,
  javascript: 93,  // Node.js 18
  java:       62,
  cpp17:      54,
  c:          50,
  go:         60,
  rust:       73,
  typescript: 94,
} as const
```

## 2. Submission Flow

### Single submission (sync, timeout < 5s)

```typescript
// types/judge0.ts
interface Judge0Submission {
  source_code: string       // base64 encoded
  language_id: number
  stdin?: string            // base64 encoded
  expected_output?: string  // base64 encoded
  cpu_time_limit?: number   // seconds, default 2.0
  cpu_extra_time?: number   // default 0.5
  wall_time_limit?: number  // default 10.0
  memory_limit?: number     // KB, default 256000 (256MB)
  max_file_size?: number    // KB, default 1024 (1MB)
}

interface Judge0Result {
  token: string
  status: { id: number; description: string }
  time: string              // "0.123"
  memory: number            // KB
  stdout: string | null     // base64
  stderr: string | null     // base64
  compile_output: string | null
  message: string | null
}

// Status IDs
const STATUS = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
}
```

### Submit và poll result

```typescript
import axios from 'axios'

const JUDGE0_URL = process.env.JUDGE0_URL   // e.g. https://judge0.railway.app
const JUDGE0_AUTH = process.env.JUDGE0_AUTH // nếu có auth header

class Judge0Client {
  private headers = JUDGE0_AUTH
    ? { 'X-Auth-Token': JUDGE0_AUTH }
    : {}

  async submit(payload: Judge0Submission): Promise<string> {
    const encoded = {
      ...payload,
      source_code: Buffer.from(payload.source_code).toString('base64'),
      stdin: payload.stdin ? Buffer.from(payload.stdin).toString('base64') : undefined,
      expected_output: payload.expected_output
        ? Buffer.from(payload.expected_output).toString('base64')
        : undefined,
    }

    const { data } = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
      encoded,
      { headers: this.headers }
    )
    return data.token
  }

  async getResult(token: string): Promise<Judge0Result> {
    const { data } = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
      { headers: this.headers }
    )
    // Decode base64 outputs
    if (data.stdout) data.stdout = Buffer.from(data.stdout, 'base64').toString()
    if (data.stderr) data.stderr = Buffer.from(data.stderr, 'base64').toString()
    if (data.compile_output)
      data.compile_output = Buffer.from(data.compile_output, 'base64').toString()
    return data
  }

  async submitAndWait(
    payload: Judge0Submission,
    maxWait = 10000,
    interval = 500
  ): Promise<Judge0Result> {
    const token = await this.submit(payload)

    const start = Date.now()
    while (Date.now() - start < maxWait) {
      const result = await this.getResult(token)
      if (result.status.id > 2) return result  // Done (not In Queue/Processing)
      await new Promise(r => setTimeout(r, interval))
    }

    // Fail-safe: timeout
    return {
      token,
      status: { id: 13, description: 'Internal Error' },
      time: '0',
      memory: 0,
      stdout: null,
      stderr: 'Execution timed out waiting for result',
      compile_output: null,
      message: 'Judge0 polling timeout'
    }
  }
}

export const judge0 = new Judge0Client()
```

## 3. Multi-testcase Runner

```typescript
async function runAllTestCases(
  code: string,
  languageId: number,
  testCases: Array<{ input: string; expectedOutput: string }>
): Promise<{
  passed: number
  total: number
  results: Array<{ status: string; time: string; passed: boolean }>
}> {
  // Submit tất cả test cases song song
  const tokens = await Promise.all(
    testCases.map(tc =>
      judge0.submit({
        source_code: code,
        language_id: languageId,
        stdin: tc.input,
        expected_output: tc.expectedOutput,
        cpu_time_limit: 2.0,
        memory_limit: 256000,
      })
    )
  )

  // Poll kết quả
  const results = await Promise.all(tokens.map(t => judge0.submitAndWait({ } as any)))
  // ... (dùng submitAndWait với token đã có)

  const passed = results.filter(r => r.status.id === 3).length
  return {
    passed,
    total: testCases.length,
    results: results.map(r => ({
      status: r.status.description,
      time: r.time,
      passed: r.status.id === 3
    }))
  }
}
```

## 4. Fail-safe Error Reporting

```typescript
function mapJudge0Error(result: Judge0Result): string {
  const { id, description } = result.status
  if (id === 6) return `Compilation Error:\n${result.compile_output}`
  if (id === 5) return `Time Limit Exceeded (>${result.time}s)`
  if (id >= 7 && id <= 12) return `Runtime Error: ${description}\n${result.stderr}`
  if (id === 13) return `Internal Error: ${result.message}`
  return description
}
```

## 5. Security — No Command Injection

```typescript
// NEVER: exec(userCode) hoặc eval(userCode)
// LUÔN: gửi qua Judge0 API, không chạy trực tiếp

// Validate trước khi submit
function validateSubmission(code: string): void {
  if (code.length > 65536) throw new Error('Code too long (max 64KB)')
  if (!code.trim()) throw new Error('Empty submission')
}
```

## Khi nào activate skill này

- Build submission endpoint
- Debug Judge0 status codes
- Implement multi-testcase runner
- Handle timeout/runtime errors
- Add new programming language support
