import { describe, it, expect } from "bun:test";
import { executeSubmission, type RunFn } from "../../src/judge/execute";
import { SandboxUnavailableError, type SandboxRunResult } from "../../src/sandbox/docker";
import type { JudgePackage } from "../../src/domain/validate";

const res = (over: Partial<SandboxRunResult> = {}): SandboxRunResult => ({
  exitCode: 0,
  timedOut: false,
  stdout: Buffer.from(""),
  stdoutExceeded: false,
  stderr: "",
  durationMs: 10,
  ...over,
});

const pkg = (n = 2): JudgePackage => ({
  packageId: "p",
  version: 1,
  comparisonMode: "exact",
  testCases: Array.from({ length: n }, (_, i) => ({ testCaseId: `t${i}`, stdin: `${i}\n`, expectedOutput: `${i}` })),
});

const limits = { cpuCores: 1, memoryLimitMb: 128, timeLimitMs: 3000 };
const scripted = (results: SandboxRunResult[]): { run: RunFn; calls: Array<{ mode: string; image: string }> } => {
  const calls: Array<{ mode: string; image: string }> = [];
  let i = 0;
  return {
    calls,
    run: async (o) => {
      calls.push({ mode: o.mode, image: o.image });
      return results[i++] ?? res();
    },
  };
};

describe("executeSubmission (python)", () => {
  it("should return AC when all outputs match", async () => {
    const s = scripted([res({ stdout: Buffer.from("0") }), res({ stdout: Buffer.from("1") })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(), limits, run: s.run });
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "AC", summary: { totalTests: 2, passedTests: 2, failedTests: 0 } });
    expect(s.calls.every((c) => c.mode === "py")).toBe(true);
  });

  it("should return WA on mismatching output", async () => {
    const s = scripted([res({ stdout: Buffer.from("0") }), res({ stdout: Buffer.from("WRONG") })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(), limits, run: s.run });
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "WA" });
  });

  it("should return TLE and emit a timeout_enforced event", async () => {
    const s = scripted([res({ exitCode: 124 })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(1), limits, run: s.run });
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "TLE" });
    if (r.executionStatus === "completed") expect(r.events.map((e) => e.type)).toContain("timeout_enforced");
  });

  it("should return RTE for non-zero exit", async () => {
    const s = scripted([res({ exitCode: 1, stderr: "Traceback" })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(1), limits, run: s.run });
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "RTE" });
  });

  it("should map exit 137 to RTE plus memory_limit_exceeded event", async () => {
    const s = scripted([res({ exitCode: 137 })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(1), limits, run: s.run });
    expect(r).toMatchObject({ verdict: "RTE" });
    if (r.executionStatus === "completed") expect(r.events.map((e) => e.type)).toContain("memory_limit_exceeded");
  });

  it("should treat exceeding output limit as RTE", async () => {
    const s = scripted([res({ stdoutExceeded: true })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(1), limits, run: s.run });
    expect(r).toMatchObject({ verdict: "RTE" });
  });

  it("should never leak expected output or hidden input into the result", async () => {
    const s = scripted([res({ stdout: Buffer.from("nope") })]);
    const p = pkg(1);
    p.testCases[0]!.expectedOutput = "SECRET_EXPECTED";
    p.testCases[0]!.stdin = "SECRET_INPUT";
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: p, limits, run: s.run });
    const json = JSON.stringify(r);
    expect(json).not.toContain("SECRET_EXPECTED");
    expect(json).not.toContain("SECRET_INPUT");
    expect(json).not.toContain("nope");
  });
});

describe("executeSubmission (per-test results)", () => {
  const mixed = (): JudgePackage => ({
    packageId: "p",
    version: 1,
    comparisonMode: "exact",
    testCases: [
      { testCaseId: "pub", stdin: "IN_PUB\n", expectedOutput: "EXP_PUB", visibility: "public" },
      { testCaseId: "hid", stdin: "IN_HID\n", expectedOutput: "EXP_HID" },
    ],
  });

  it("should report verdict and runtime per test", async () => {
    const s = scripted([res({ stdout: Buffer.from("EXP_PUB"), durationMs: 11 }), res({ stdout: Buffer.from("bad"), durationMs: 22 })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: mixed(), limits, run: s.run });
    if (r.executionStatus !== "completed") throw new Error("expected completed");
    expect(r.diagnostics.tests).toMatchObject([
      { testCaseId: "pub", verdict: "AC", passed: true, runtimeMs: 11 },
      { testCaseId: "hid", verdict: "WA", passed: false, runtimeMs: 22 },
    ]);
  });

  it("should expose input, actual and expected output for public tests only", async () => {
    const s = scripted([res({ stdout: Buffer.from("mine") }), res({ stdout: Buffer.from("hidden-actual") })]);
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: mixed(), limits, run: s.run });
    if (r.executionStatus !== "completed") throw new Error("expected completed");
    const [pub, hid] = r.diagnostics.tests!;
    expect(pub).toMatchObject({ visibility: "public", input: "IN_PUB\n", actualOutput: "mine", expectedOutput: "EXP_PUB" });
    expect(hid).toMatchObject({ visibility: "hidden" });
    const hidJson = JSON.stringify(hid);
    for (const secret of ["IN_HID", "EXP_HID", "hidden-actual"]) expect(hidJson).not.toContain(secret);
  });

  it("should truncate long public output to 4096 bytes and flag it", async () => {
    const s = scripted([res({ stdout: Buffer.from("a".repeat(10000)) })]);
    const p = mixed();
    p.testCases = [p.testCases[0]!];
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: p, limits, run: s.run });
    if (r.executionStatus !== "completed") throw new Error("expected completed");
    const t = r.diagnostics.tests![0]!;
    expect(t.actualOutput!.length).toBe(4096);
    expect(t.truncated).toBe(true);
  });

  it("should return an empty tests list on compile error", async () => {
    const s = scripted([res({ exitCode: 90, stderr: "error: boom" })]);
    const r = await executeSubmission({ language: "cpp", sourceCode: "x", pkg: mixed(), limits, run: s.run });
    if (r.executionStatus !== "completed") throw new Error("expected completed");
    expect(r.diagnostics.tests ?? []).toEqual([]);
  });
});

describe("executeSubmission (cpp)", () => {
  it("should compile once then run each test with the produced binary", async () => {
    const s = scripted([
      res({ stdout: Buffer.from("BIN") }),
      res({ stdout: Buffer.from("0") }),
      res({ stdout: Buffer.from("1") }),
    ]);
    const r = await executeSubmission({ language: "cpp", sourceCode: "x", pkg: pkg(), limits, run: s.run });
    expect(r).toMatchObject({ verdict: "AC" });
    expect(s.calls.map((c) => c.mode)).toEqual(["cpp-compile", "bin-run", "bin-run"]);
  });

  it("should return CE with a redacted compile message when compilation fails (exit 90)", async () => {
    const s = scripted([res({ exitCode: 90, stderr: "/tmp/src.cpp:1:1: error: boom" })]);
    const r = await executeSubmission({ language: "cpp", sourceCode: "x", pkg: pkg(), limits, run: s.run });
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "CE" });
    if (r.executionStatus === "completed") {
      expect(r.diagnostics.compileMessage).toContain("error: boom");
      expect(r.diagnostics.compileMessage).not.toContain("/tmp/");
    }
    expect(s.calls).toHaveLength(1);
  });

  it("should return CE when compilation times out (exit 124)", async () => {
    const s = scripted([res({ exitCode: 124 })]);
    const r = await executeSubmission({ language: "cpp", sourceCode: "x", pkg: pkg(), limits, run: s.run });
    expect(r).toMatchObject({ verdict: "CE" });
  });
});

describe("executeSubmission (infrastructure failure)", () => {
  it("should return failed/SANDBOX_UNAVAILABLE (retryable) and no verdict when docker is unavailable", async () => {
    const run: RunFn = async () => {
      throw new SandboxUnavailableError("docker daemon down");
    };
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(), limits, run });
    expect(r).toEqual({
      executionStatus: "failed",
      failure: { code: "SANDBOX_UNAVAILABLE", retryable: true },
      events: expect.any(Array),
    });
    expect("verdict" in r).toBe(false);
  });

  it("should return failed/WORKER_FAILURE for unexpected errors, never WA", async () => {
    const run: RunFn = async () => {
      throw new Error("kaboom");
    };
    const r = await executeSubmission({ language: "python", sourceCode: "x", pkg: pkg(), limits, run });
    expect(r).toMatchObject({ executionStatus: "failed", failure: { code: "WORKER_FAILURE" } });
  });
});
