import { createReceiver, type ResultRecord } from "./receiver";

const PORT = Number(process.env.PORT ?? 3000);
const JUDGE_API_URL = process.env.JUDGE_API_URL ?? "http://localhost:4000";
const JUDGE_API_TOKEN = process.env.JUDGE_API_TOKEN ?? "dev-m3-token";
const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN ?? "dev-callback-token";

/** Demo problem: "A + B". Hidden tests live only here (M3) and in M6's private snapshot. */
const PROBLEM = {
  packageId: "math-sum",
  version: 1,
  comparisonMode: "trim_trailing_whitespace",
  testCases: [
    { testCaseId: "tc-1", stdin: "2 3\n", expectedOutput: "5", visibility: "public" },
    { testCaseId: "tc-2", stdin: "10 -4\n", expectedOutput: "6" },
    { testCaseId: "tc-3", stdin: "0 0\n", expectedOutput: "0" },
  ],
};

interface Submission {
  clientSubmissionId: string;
  judgeSubmissionId?: string;
  language: string;
  label: string;
  createdAt: string;
  status: "submitting" | "queued" | "rejected" | "done";
  error?: string;
  result?: ResultRecord;
}
const submissions = new Map<string, Submission>();

const receiver = createReceiver({
  token: CALLBACK_TOKEN,
  onResult(r) {
    const s = submissions.get(r.clientSubmissionId);
    if (s) {
      s.status = "done";
      s.result = r;
    }
  },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function submit(req: Request): Promise<Response> {
  const b = (await req.json().catch(() => null)) as { language?: string; sourceCode?: string; label?: string } | null;
  if (!b?.language || typeof b.sourceCode !== "string") return json(400, { error: "language and sourceCode required" });

  const clientSubmissionId = crypto.randomUUID();
  const sub: Submission = {
    clientSubmissionId,
    language: b.language,
    label: b.label ?? "custom",
    createdAt: new Date().toISOString(),
    status: "submitting",
  };
  submissions.set(clientSubmissionId, sub);

  try {
    const res = await fetch(`${JUDGE_API_URL}/internal/v1/judge-submissions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${JUDGE_API_TOKEN}`,
        "content-type": "application/json",
        "idempotency-key": clientSubmissionId,
      },
      body: JSON.stringify({
        contractVersion: "1.0",
        clientSubmissionId,
        attemptId: crypto.randomUUID(),
        assessmentItemId: crypto.randomUUID(),
        revision: 1,
        language: b.language,
        sourceCode: b.sourceCode,
        judgePackage: PROBLEM,
      }),
    });
    const body: any = await res.json();
    if (res.status === 202 || res.status === 200) {
      sub.status = sub.status === "done" ? "done" : "queued";
      sub.judgeSubmissionId = body.judgeSubmissionId;
    } else {
      sub.status = "rejected";
      sub.error = `${body?.error?.code ?? res.status}: ${body?.error?.message ?? ""}`;
    }
  } catch (e) {
    sub.status = "rejected";
    sub.error = `Judge API unreachable: ${(e as Error).message}`;
  }
  return json(sub.status === "rejected" ? 502 : 202, sub);
}

const publicDir = `${import.meta.dir}/public`;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/internal/v1/judge-results") return receiver.handle(req);
    if (req.method === "POST" && url.pathname === "/api/submit") return submit(req);
    if (req.method === "GET" && url.pathname === "/api/submissions") {
      const list = [...submissions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
      return json(200, {
        submissions: list,
        stats: { received: receiver.results().length, duplicates: receiver.duplicates(), failNext: receiver.pendingFailures() },
      });
    }
    if (req.method === "POST" && url.pathname === "/api/fail-next") {
      const b = (await req.json().catch(() => ({}))) as { count?: number };
      receiver.failNext(Math.max(0, Math.min(10, Number(b.count ?? 1))));
      return json(200, { failNext: receiver.pendingFailures() });
    }
    if (req.method === "GET" && url.pathname === "/health") return json(200, { status: "ok" });
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html"))
      return new Response(Bun.file(`${publicDir}/index.html`));
    return json(404, { error: "not found" });
  },
});
console.log(`mock-m3 listening on :${PORT} → judge ${JUDGE_API_URL}`);
