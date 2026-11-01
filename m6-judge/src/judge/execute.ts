import { outputsMatch } from "../domain/compare";
import { POLICY, type RuntimeLimits } from "../domain/limits";
import { redactCompileMessage } from "../domain/safe";
import { aggregateVerdict, classifyRun, type Summary, type TestResult, type Verdict } from "../domain/verdict";
import type { JudgePackage, Language } from "../domain/validate";
import { IMAGES } from "../sandbox/images";
import {
  SandboxUnavailableError,
  frameStdin,
  runInSandbox,
  type SandboxRunOptions,
  type SandboxRunResult,
} from "../sandbox/docker";

export type RunFn = (o: SandboxRunOptions) => Promise<SandboxRunResult>;

export interface TechnicalEvent {
  type: string;
  testCaseId?: string;
}

/** Per-test detail. Input/output fields are present for public tests only. */
export interface TestDetail {
  testCaseId: string;
  visibility: "public" | "hidden";
  verdict: "AC" | "WA" | "TLE" | "RTE";
  passed: boolean;
  runtimeMs: number;
  input?: string;
  actualOutput?: string;
  expectedOutput?: string;
  truncated?: boolean;
}

export const PUBLIC_OUTPUT_MAX_BYTES = 4096;

export type ExecutionOutcome =
  | {
      executionStatus: "completed";
      verdict: Verdict;
      summary: Summary;
      metrics: { runtimeMs: number };
      diagnostics: { compileMessage: string | null; tests?: TestDetail[] };
      events: TechnicalEvent[];
    }
  | {
      executionStatus: "failed";
      failure: { code: string; retryable: boolean };
      events: TechnicalEvent[];
    };

export interface ExecuteInput {
  language: Language;
  sourceCode: string;
  pkg: JudgePackage;
  limits: RuntimeLimits;
  run?: RunFn;
}

const EXIT_COMPILE_ERROR = 90;
const EXIT_TIMEOUT = 124;

/** Runs the whole judge package in the sandbox and computes a verdict. Never returns hidden data. */
export async function executeSubmission(input: ExecuteInput): Promise<ExecutionOutcome> {
  const run = input.run ?? runInSandbox;
  const { language, limits, pkg } = input;
  const events: TechnicalEvent[] = [];
  const runBase = {
    timeLimitMs: limits.timeLimitMs,
    memoryMb: limits.memoryLimitMb,
    cpus: limits.cpuCores,
    pids: 64,
    tmpfsMb: 32,
    maxStdoutBytes: POLICY.maxStdoutBytes,
    maxStderrBytes: POLICY.maxStderrBytes,
  };

  try {
    let image: string = IMAGES.python;
    let mode: SandboxRunOptions["mode"] = "py";
    let payload: Buffer = Buffer.from(input.sourceCode);

    if (language === "cpp") {
      const c = await run({
        ...runBase,
        image: IMAGES.cpp,
        mode: "cpp-compile",
        stdin: frameStdin(payload, ""),
        timeLimitMs: POLICY.compile.timeLimitMs,
        memoryMb: POLICY.compile.memoryLimitMb,
        pids: 128,
        tmpfsMb: 64,
        maxStdoutBytes: 8 * 1024 * 1024,
      });
      if (c.exitCode !== 0 || c.timedOut) {
        const timedOut = c.timedOut || c.exitCode === EXIT_TIMEOUT;
        const raw = c.exitCode === EXIT_COMPILE_ERROR ? c.stderr : timedOut ? "Compilation timed out." : "Compilation failed.";
        events.push({ type: "compile_failed" });
        return {
          executionStatus: "completed",
          verdict: "CE",
          summary: { totalTests: pkg.testCases.length, passedTests: 0, failedTests: pkg.testCases.length },
          metrics: { runtimeMs: 0 },
          diagnostics: { compileMessage: redactCompileMessage(raw) },
          events,
        };
      }
      image = IMAGES.cpp;
      mode = "bin-run";
      payload = c.stdout;
    }

    const results: TestResult[] = [];
    const details: TestDetail[] = [];
    let maxMs = 0;
    for (const t of pkg.testCases) {
      const r = await run({ ...runBase, image, mode, stdin: frameStdin(payload, t.stdin) });
      maxMs = Math.max(maxMs, r.durationMs);
      const outcome = classifyRun({ exitCode: r.exitCode, timedOut: r.timedOut, outputExceeded: r.stdoutExceeded });
      if (outcome === "TLE") events.push({ type: "timeout_enforced", testCaseId: t.testCaseId });
      if (outcome === "RTE" && r.exitCode === 137 && !r.timedOut) events.push({ type: "memory_limit_exceeded", testCaseId: t.testCaseId });
      const matched = outcome === "OK" && outputsMatch(r.stdout.toString("utf8"), t.expectedOutput, pkg.comparisonMode);
      results.push({ outcome, matched });

      const isPublic = t.visibility === "public";
      const detail: TestDetail = {
        testCaseId: t.testCaseId,
        visibility: isPublic ? "public" : "hidden",
        verdict: outcome === "OK" ? (matched ? "AC" : "WA") : outcome,
        passed: matched,
        runtimeMs: r.durationMs,
      };
      if (isPublic) {
        const out = r.stdout.subarray(0, PUBLIC_OUTPUT_MAX_BYTES);
        detail.input = t.stdin;
        detail.expectedOutput = t.expectedOutput;
        detail.actualOutput = out.toString("utf8");
        if (r.stdout.length > PUBLIC_OUTPUT_MAX_BYTES) detail.truncated = true;
      }
      details.push(detail);
    }
    const { verdict, summary } = aggregateVerdict(results);
    return {
      executionStatus: "completed",
      verdict,
      summary,
      // Wall-clock of the slowest container run (includes container start-up).
      metrics: { runtimeMs: maxMs },
      diagnostics: { compileMessage: null, tests: details },
      events,
    };
  } catch (e) {
    if (e instanceof SandboxUnavailableError) {
      events.push({ type: "sandbox_unavailable" });
      return { executionStatus: "failed", failure: { code: "SANDBOX_UNAVAILABLE", retryable: true }, events };
    }
    events.push({ type: "worker_failure" });
    return { executionStatus: "failed", failure: { code: "WORKER_FAILURE", retryable: true }, events };
  }
}
