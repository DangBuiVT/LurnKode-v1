import { describe, it, expect } from "bun:test";
import { backoffDelayMs, classifyCallbackStatus, MAX_CALLBACK_ATTEMPTS } from "../../src/domain/backoff";
import { truncate, redactCompileMessage } from "../../src/domain/safe";

describe("classifyCallbackStatus", () => {
  it("should ack on 2xx", () => {
    expect(classifyCallbackStatus(200)).toBe("ack");
    expect(classifyCallbackStatus(204)).toBe("ack");
  });
  it("should retry on 408, 429 and 5xx", () => {
    for (const s of [408, 429, 500, 502, 503]) expect(classifyCallbackStatus(s)).toBe("retry");
  });
  it("should stop (fatal) on other 4xx", () => {
    for (const s of [400, 401, 403, 404, 409, 422]) expect(classifyCallbackStatus(s)).toBe("fatal");
  });
  it("should retry on network failure (status 0)", () => {
    expect(classifyCallbackStatus(0)).toBe("retry");
  });
});

describe("backoffDelayMs", () => {
  it("should grow exponentially without jitter", () => {
    const d1 = backoffDelayMs(1, () => 0);
    const d2 = backoffDelayMs(2, () => 0);
    const d3 = backoffDelayMs(3, () => 0);
    expect(d2).toBe(d1 * 2);
    expect(d3).toBe(d1 * 4);
  });
  it("should add bounded jitter", () => {
    const base = backoffDelayMs(2, () => 0);
    const jittered = backoffDelayMs(2, () => 1);
    expect(jittered).toBeGreaterThan(base);
    expect(jittered).toBeLessThanOrEqual(base * 1.5);
  });
  it("should cap the delay", () => {
    expect(backoffDelayMs(50, () => 0)).toBeLessThanOrEqual(60_000);
  });
  it("should expose a finite attempt budget", () => {
    expect(MAX_CALLBACK_ATTEMPTS).toBeGreaterThan(1);
  });
});

describe("truncate", () => {
  it("should leave short strings untouched", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });
  it("should cut long strings to max bytes and mark truncation", () => {
    const out = truncate("x".repeat(100), 10);
    expect(out.startsWith("xxxxxxxxxx")).toBe(true);
    expect(out).toContain("[truncated]");
  });
});

describe("redactCompileMessage", () => {
  it("should strip host/temp paths", () => {
    const msg = redactCompileMessage("/tmp/src.cpp:3:5: error: expected ';'\n");
    expect(msg).not.toContain("/tmp/");
    expect(msg).toContain("error: expected ';'");
  });
  it("should bound message length to 1KB", () => {
    expect(redactCompileMessage("e".repeat(5000))!.length).toBeLessThan(1100);
  });
  it("should return null for empty input", () => {
    expect(redactCompileMessage("")).toBeNull();
  });
});
