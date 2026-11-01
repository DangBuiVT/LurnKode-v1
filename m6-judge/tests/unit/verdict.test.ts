import { describe, it, expect } from "bun:test";
import { classifyRun, aggregateVerdict } from "../../src/domain/verdict";

describe("classifyRun", () => {
  it("should return OK when exit code is 0", () => {
    expect(classifyRun({ exitCode: 0, timedOut: false })).toBe("OK");
  });

  it("should return TLE when the run timed out", () => {
    expect(classifyRun({ exitCode: 124, timedOut: true })).toBe("TLE");
  });

  it("should return TLE when timeout wrapper exit code is 124", () => {
    expect(classifyRun({ exitCode: 124, timedOut: false })).toBe("TLE");
  });

  it("should return RTE for non-zero exit code", () => {
    expect(classifyRun({ exitCode: 1, timedOut: false })).toBe("RTE");
  });

  it("should return RTE when killed by signal (137, e.g. OOM)", () => {
    expect(classifyRun({ exitCode: 137, timedOut: false })).toBe("RTE");
  });

  it("should return RTE when output limit was exceeded", () => {
    expect(classifyRun({ exitCode: 0, timedOut: false, outputExceeded: true })).toBe("RTE");
  });
});

describe("aggregateVerdict", () => {
  it("should return AC when every test passes", () => {
    const r = aggregateVerdict(["OK", "OK"].map((o) => ({ outcome: o as "OK", matched: true })));
    expect(r.verdict).toBe("AC");
    expect(r.summary).toEqual({ totalTests: 2, passedTests: 2, failedTests: 0 });
  });

  it("should return WA when output mismatches", () => {
    const r = aggregateVerdict([
      { outcome: "OK", matched: true },
      { outcome: "OK", matched: false },
    ]);
    expect(r.verdict).toBe("WA");
    expect(r.summary.failedTests).toBe(1);
  });

  it("should prefer the first failing test's verdict (TLE before later WA)", () => {
    const r = aggregateVerdict([
      { outcome: "OK", matched: true },
      { outcome: "TLE", matched: false },
      { outcome: "OK", matched: false },
    ]);
    expect(r.verdict).toBe("TLE");
    expect(r.summary).toEqual({ totalTests: 3, passedTests: 1, failedTests: 2 });
  });

  it("should return RTE when a test crashes", () => {
    const r = aggregateVerdict([{ outcome: "RTE", matched: false }]);
    expect(r.verdict).toBe("RTE");
  });
});
