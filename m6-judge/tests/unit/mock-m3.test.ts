import { describe, it, expect } from "bun:test";
import { createReceiver } from "../../mock-m3/receiver";

const payload = (over: Record<string, unknown> = {}) => ({
  contractVersion: "1.0",
  eventId: "e1072b9c-62e1-4a24-a40a-0cc6c9d63980",
  judgeSubmissionId: "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  clientSubmissionId: "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  executionStatus: "completed",
  verdict: "AC",
  ...over,
});
const req = (body: unknown, token = "tok") =>
  new Request("http://m3/internal/v1/judge-results", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("mock M3 receiver", () => {
  it("should reject callbacks without the right credentials (401)", async () => {
    const r = createReceiver({ token: "tok" });
    expect((await r.handle(req(payload(), "bad"))).status).toBe(401);
    expect(r.results()).toHaveLength(0);
  });

  it("should store a new result and acknowledge with 200", async () => {
    const r = createReceiver({ token: "tok" });
    const res = await r.handle(req(payload()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ duplicate: false });
    expect(r.results()).toHaveLength(1);
    expect(r.results()[0]).toMatchObject({ verdict: "AC", clientSubmissionId: payload().clientSubmissionId });
  });

  it("should treat the same event delivered twice as one result (idempotent)", async () => {
    const r = createReceiver({ token: "tok" });
    await r.handle(req(payload()));
    const res = await r.handle(req(payload()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ duplicate: true });
    expect(r.results()).toHaveLength(1);
    expect(r.duplicates()).toBe(1);
  });

  it("should reject an already-seen eventId with a different payload (409)", async () => {
    const r = createReceiver({ token: "tok" });
    await r.handle(req(payload()));
    expect((await r.handle(req(payload({ verdict: "WA" })))).status).toBe(409);
  });

  it("should reject malformed payloads (422)", async () => {
    const r = createReceiver({ token: "tok" });
    expect((await r.handle(req({ nope: true }))).status).toBe(422);
  });

  it("should fail the next N deliveries with 503 without recording them (retry demo)", async () => {
    const r = createReceiver({ token: "tok" });
    r.failNext(2);
    expect((await r.handle(req(payload()))).status).toBe(503);
    expect((await r.handle(req(payload()))).status).toBe(503);
    expect(r.results()).toHaveLength(0);
    expect((await r.handle(req(payload()))).status).toBe(200);
    expect(r.results()).toHaveLength(1);
  });

  it("should accept failed (infrastructure) results that carry no verdict", async () => {
    const r = createReceiver({ token: "tok" });
    const res = await r.handle(
      req(payload({ eventId: "08a43ef5-3f36-4c51-9c63-d67f3bba96c2", executionStatus: "failed", verdict: undefined, failure: { code: "SANDBOX_UNAVAILABLE", retryable: true } })),
    );
    expect(res.status).toBe(200);
    expect(r.results()[0]!.verdict).toBeUndefined();
    expect(r.results()[0]!.failureCode).toBe("SANDBOX_UNAVAILABLE");
  });

  it("should keep per-test diagnostics from the callback", async () => {
    const r = createReceiver({ token: "tok" });
    const tests = [{ testCaseId: "tc-1", verdict: "AC", passed: true, runtimeMs: 5, visibility: "public" }];
    await r.handle(req(payload({ diagnostics: { compileMessage: null, tests } })));
    expect(r.results()[0]!.tests).toEqual(tests);
  });
});
