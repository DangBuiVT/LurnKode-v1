import { timingSafeEqual } from "node:crypto";
import { canonicalHash } from "../src/domain/hash";

export interface ResultRecord {
  eventId: string;
  judgeSubmissionId: string;
  clientSubmissionId: string;
  executionStatus: string;
  verdict?: string;
  summary?: { totalTests: number; passedTests: number; failedTests: number };
  metrics?: { runtimeMs?: number };
  compileMessage?: string | null;
  tests?: Array<Record<string, unknown>>;
  failureCode?: string;
  receivedAt: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Stand-in for M3's result endpoint: authenticates, de-duplicates by eventId and
 * rejects inconsistent replays. `failNext(n)` simulates a temporarily failing M3.
 */
export function createReceiver(opts: { token: string; onResult?: (r: ResultRecord) => void }) {
  const seen = new Map<string, string>(); // eventId -> payload hash
  const results: ResultRecord[] = [];
  let failures = 0;
  let duplicates = 0;

  return {
    async handle(req: Request): Promise<Response> {
      const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
      if (!m || !safeEq(m[1]!, opts.token)) return json(401, { error: "unauthenticated" });

      if (failures > 0) {
        failures--;
        return json(503, { error: "temporarily unavailable (simulated)" });
      }

      let body: any;
      try {
        body = await req.json();
      } catch {
        return json(422, { error: "invalid json" });
      }
      if (
        !body ||
        body.contractVersion !== "1.0" ||
        typeof body.eventId !== "string" ||
        typeof body.judgeSubmissionId !== "string" ||
        typeof body.clientSubmissionId !== "string"
      )
        return json(422, { error: "invalid payload" });

      const hash = canonicalHash(body);
      const prev = seen.get(body.eventId);
      if (prev !== undefined) {
        if (prev !== hash) return json(409, { error: "eventId reused with different payload" });
        duplicates++;
        return json(200, { duplicate: true });
      }
      seen.set(body.eventId, hash);
      const rec: ResultRecord = {
        eventId: body.eventId,
        judgeSubmissionId: body.judgeSubmissionId,
        clientSubmissionId: body.clientSubmissionId,
        executionStatus: body.executionStatus,
        verdict: body.verdict,
        summary: body.summary,
        metrics: body.metrics,
        compileMessage: body.diagnostics?.compileMessage ?? null,
        tests: Array.isArray(body.diagnostics?.tests) ? body.diagnostics.tests : undefined,
        failureCode: body.failure?.code,
        receivedAt: new Date().toISOString(),
      };
      results.push(rec);
      opts.onResult?.(rec);
      return json(200, { duplicate: false });
    },
    results: () => results,
    duplicates: () => duplicates,
    failNext(n: number) {
      failures = n;
    },
    pendingFailures: () => failures,
  };
}
