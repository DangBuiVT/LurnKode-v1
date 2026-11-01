import { Elysia } from "elysia";
import { timingSafeEqual } from "node:crypto";
import type { ServiceToken } from "../config";
import type { Store } from "../db/store";
import { canonicalHash } from "../domain/hash";
import { clampLimits } from "../domain/limits";
import { validateSubmission, validIdempotencyKey } from "../domain/validate";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRACE = /^[A-Za-z0-9-]{8,64}$/;

export interface AppDeps {
  store: Store;
  tokens: ServiceToken[];
  rateLimitPerMin: number;
}

const safeEq = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export function createApp(deps: AppDeps) {
  const windows = new Map<string, { start: number; count: number }>();

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  const fail = (status: number, code: string, message: string, traceId: string, retryable = false, headers = {}) =>
    json(status, { error: { code, message, traceId, retryable } }, { "x-trace-id": traceId, ...headers });

  const authenticate = (req: Request): ServiceToken | null => {
    const h = req.headers.get("authorization") ?? "";
    const m = /^Bearer (.+)$/.exec(h);
    if (!m) return null;
    return deps.tokens.find((t) => safeEq(t.token, m[1]!)) ?? null;
  };

  const rateLimited = (caller: string): number | null => {
    const now = Date.now();
    const w = windows.get(caller);
    if (!w || now - w.start >= 60_000) {
      windows.set(caller, { start: now, count: 1 });
      return null;
    }
    w.count++;
    return w.count > deps.rateLimitPerMin ? Math.max(1, Math.ceil((60_000 - (now - w.start)) / 1000)) : null;
  };

  return new Elysia()
    .get("/health", () => ({ status: "ok" }))
    .post(
      "/internal/v1/judge-submissions",
      async ({ request }) => {
        const t = request.headers.get("x-trace-id");
        const traceId = t && TRACE.test(t) ? t : crypto.randomUUID();

        const caller = authenticate(request);
        if (!caller) return fail(401, "UNAUTHENTICATED_SERVICE", "Missing or invalid service credentials.", traceId);
        if (!caller.scopes.includes("submit"))
          return fail(403, "SERVICE_NOT_ALLOWED", "The service is not allowed to submit.", traceId);

        const wait = rateLimited(caller.id);
        if (wait !== null)
          return fail(429, "RATE_LIMITED", "Rate limit exceeded.", traceId, true, { "retry-after": String(wait) });

        const key = request.headers.get("idempotency-key");
        if (!validIdempotencyKey(key)) return fail(400, "INVALID_REQUEST", "Idempotency-Key header is required.", traceId);

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_BODY_BYTES) return fail(413, "PAYLOAD_TOO_LARGE", "Request body is too large.", traceId);

        let body: unknown;
        try {
          const text = await request.text();
          if (text.length > MAX_BODY_BYTES) return fail(413, "PAYLOAD_TOO_LARGE", "Request body is too large.", traceId);
          body = JSON.parse(text);
        } catch {
          return fail(400, "INVALID_REQUEST", "Body must be valid JSON.", traceId);
        }

        const v = validateSubmission(body);
        if (!v.ok) return fail(v.status, v.code, v.message, traceId);

        try {
          const r = await deps.store.createSubmission({
            callerId: caller.id,
            idempotencyKey: key,
            requestHash: canonicalHash(v.value),
            request: v.value,
            traceId,
            limits: clampLimits(v.value.requestedRuntimeLimits),
          });
          if (r.kind === "key_reused")
            return fail(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was used with a different payload.", traceId);
          if (r.kind === "client_exists")
            return fail(409, "CLIENT_SUBMISSION_ALREADY_EXISTS", "clientSubmissionId already exists.", traceId);

          const s = r.submission;
          const replay = r.kind === "replay";
          return json(
            replay ? 200 : 202,
            {
              contractVersion: "1.0",
              judgeSubmissionId: s.id,
              clientSubmissionId: s.clientSubmissionId,
              status: s.status,
              acceptedAt: new Date(s.createdAt).toISOString(),
              traceId: s.traceId,
            },
            { "x-trace-id": s.traceId, ...(replay ? { "idempotent-replay": "true" } : {}) },
          );
        } catch (e) {
          console.error(JSON.stringify({ level: "error", msg: "createSubmission failed", traceId, err: (e as Error).message }));
          return fail(503, "DEPENDENCY_UNAVAILABLE", "A required dependency is unavailable.", traceId, true);
        }
      },
      { parse: "none" },
    )
    .get("/internal/v1/judge-submissions/:id", async ({ request, params }) => {
      const traceId = crypto.randomUUID();
      const caller = authenticate(request);
      if (!caller) return fail(401, "UNAUTHENTICATED_SERVICE", "Missing or invalid service credentials.", traceId);
      if (!caller.scopes.includes("read")) return fail(403, "SERVICE_NOT_ALLOWED", "Not allowed.", traceId);
      if (!UUID.test(params.id)) return fail(400, "INVALID_REQUEST", "id must be a UUID.", traceId);
      try {
        const s = await deps.store.getStatus(params.id);
        return s ? json(200, s, { "x-trace-id": traceId }) : fail(404, "NOT_FOUND", "Submission not found.", traceId);
      } catch {
        return fail(503, "DEPENDENCY_UNAVAILABLE", "A required dependency is unavailable.", traceId, true);
      }
    })
    .onError(({ code, set }) => {
      const traceId = crypto.randomUUID();
      set.status = code === "NOT_FOUND" ? 404 : 400;
      return { error: { code: code === "NOT_FOUND" ? "NOT_FOUND" : "INVALID_REQUEST", message: "Request cannot be handled.", traceId, retryable: false } };
    });
}
