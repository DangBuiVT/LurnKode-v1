import { describe, it, expect } from "bun:test";

/**
 * End-to-end through the whole compose stack:
 *   mock-m3 → judge-api → postgres outbox → dispatcher → BullMQ/Redis → worker → Docker sandbox
 *   → result outbox → callback → mock-m3
 * Requires `docker compose up -d --build` first.
 */
const M3 = process.env.M3_URL ?? "http://localhost:3000";
const API = process.env.JUDGE_API_URL ?? "http://localhost:4000";

interface Sub {
  clientSubmissionId: string;
  judgeSubmissionId?: string;
  status: string;
  error?: string;
  result?: { verdict?: string; executionStatus: string; summary?: any; compileMessage?: string | null; failureCode?: string };
}

const submit = async (language: string, sourceCode: string): Promise<Sub> => {
  const res = await fetch(`${M3}/api/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language, sourceCode, label: "e2e" }),
  });
  expect(res.status).toBe(202);
  return (await res.json()) as Sub;
};

const list = async () => (await (await fetch(`${M3}/api/submissions`)).json()) as { submissions: Sub[]; stats: any };

async function settled(id: string, timeoutMs = 60_000): Promise<Sub> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const s = (await list()).submissions.find((x) => x.clientSubmissionId === id);
    if (s?.result) return s;
    if (Date.now() > end) throw new Error(`timeout waiting for verdict of ${id}: ${JSON.stringify(s)}`);
    await Bun.sleep(400);
  }
}
const judge = async (language: string, src: string) => settled((await submit(language, src)).clientSubmissionId);

const sh = (cmd: string[]) => new TextDecoder().decode(Bun.spawnSync(cmd, { stdout: "pipe" }).stdout).trim();

describe("e2e: python", () => {
  it("should deliver AC with 3/3 tests via callback", async () => {
    const s = await judge("python", "a,b=map(int,input().split())\nprint(a+b)\n");
    expect(s.result).toMatchObject({ executionStatus: "completed", verdict: "AC", summary: { totalTests: 3, passedTests: 3, failedTests: 0 } });
  }, 90_000);

  it("should deliver WA", async () => {
    expect((await judge("python", "a,b=map(int,input().split())\nprint(a-b)\n")).result?.verdict).toBe("WA");
  }, 90_000);

  it("should deliver TLE for an infinite loop", async () => {
    expect((await judge("python", "while True: pass\n")).result?.verdict).toBe("TLE");
  }, 90_000);

  it("should deliver RTE for a crash", async () => {
    expect((await judge("python", "print(1//0)\n")).result?.verdict).toBe("RTE");
  }, 90_000);

  it("should be AC only if the sandbox really has no network", async () => {
    const src = "import socket\ntry:\n socket.create_connection(('1.1.1.1',53),timeout=2); print('NET')\nexcept Exception: pass\na,b=map(int,input().split())\nprint(a+b)\n";
    expect((await judge("python", src)).result?.verdict).toBe("AC");
  }, 90_000);
});

describe("e2e: c++", () => {
  it("should deliver AC", async () => {
    const s = await judge("cpp", "#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b;}\n");
    expect(s.result).toMatchObject({ verdict: "AC", summary: { passedTests: 3 } });
  }, 120_000);

  it("should deliver CE with a redacted compiler message", async () => {
    const s = await judge("cpp", "int main(){ return 0 }\n");
    expect(s.result?.verdict).toBe("CE");
    expect(s.result?.compileMessage).toContain("error");
    expect(s.result?.compileMessage).not.toContain("/tmp/");
  }, 120_000);
});

describe("e2e: reliability", () => {
  it("should survive a failing M3: callback is retried with the same event and delivered once", async () => {
    const before = (await list()).stats.received;
    await fetch(`${M3}/api/fail-next`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ count: 2 }) });
    const s = await settled((await submit("python", "a,b=map(int,input().split())\nprint(a+b)\n")).clientSubmissionId, 120_000);
    expect(s.result?.verdict).toBe("AC");
    const after = await list();
    expect(after.stats.received).toBe(before + 1);
  }, 150_000);

  it("should replay identical API requests idempotently (200 + same id) and conflict on payload change", async () => {
    const body = (src: string) =>
      JSON.stringify({
        contractVersion: "1.0",
        clientSubmissionId: "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12),
        attemptId: crypto.randomUUID(),
        assessmentItemId: crypto.randomUUID(),
        revision: 1,
        language: "python",
        sourceCode: src,
        judgePackage: { packageId: "p", version: 1, comparisonMode: "exact", testCases: [{ testCaseId: "t", stdin: "", expectedOutput: "1" }] },
      });
    const key = crypto.randomUUID();
    const b = body("print(1)");
    const post = (payload: string) =>
      fetch(`${API}/internal/v1/judge-submissions`, {
        method: "POST",
        headers: { authorization: "Bearer dev-m3-token", "idempotency-key": key, "content-type": "application/json" },
        body: payload,
      });
    const a1 = await post(b);
    const a2 = await post(b);
    expect(a1.status).toBe(202);
    expect(a2.status).toBe(200);
    expect(a2.headers.get("idempotent-replay")).toBe("true");
    expect((await a2.json()).judgeSubmissionId).toBe((await a1.json()).judgeSubmissionId);
    expect((await post(body("print(2)"))).status).toBe(409);
  });

  it("should never expose source or hidden tests through the status endpoint", async () => {
    const s = await judge("python", "print('TOP_SECRET_SOURCE')\n");
    const res = await fetch(`${API}/internal/v1/judge-submissions/${s.judgeSubmissionId}`, { headers: { authorization: "Bearer dev-ops-token" } });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain("TOP_SECRET_SOURCE");
    expect(text).not.toContain("expectedOutput");
    expect(JSON.parse(text)).toMatchObject({ status: "completed", verdict: "WA" });
  }, 90_000);

  it("should reject unauthenticated callers", async () => {
    const res = await fetch(`${API}/internal/v1/judge-submissions/${crypto.randomUUID()}`);
    expect(res.status).toBe(401);
  });

  it("should leave no sandbox containers behind after all executions", async () => {
    await Bun.sleep(1500);
    expect(sh(["docker", "ps", "-a", "-q", "--filter", "label=m6.judge=sandbox"])).toBe("");
  });
});
