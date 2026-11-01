export type RunOutcome = "OK" | "TLE" | "RTE";
export type Verdict = "AC" | "WA" | "TLE" | "RTE" | "CE";

export interface RunInfo {
  exitCode: number;
  timedOut: boolean;
  outputExceeded?: boolean;
}

/** Exit code produced by GNU `timeout` when the command timed out. */
export const TIMEOUT_EXIT_CODE = 124;

export function classifyRun(r: RunInfo): RunOutcome {
  if (r.timedOut || r.exitCode === TIMEOUT_EXIT_CODE) return "TLE";
  if (r.outputExceeded) return "RTE";
  return r.exitCode === 0 ? "OK" : "RTE";
}

export interface TestResult {
  outcome: RunOutcome;
  matched: boolean;
}

export interface Summary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

/** Verdict of the whole package: the first failing test decides. */
export function aggregateVerdict(results: TestResult[]): { verdict: Verdict; summary: Summary } {
  const passed = results.filter((r) => r.outcome === "OK" && r.matched).length;
  const firstFail = results.find((r) => !(r.outcome === "OK" && r.matched));
  const verdict: Verdict = !firstFail ? "AC" : firstFail.outcome === "OK" ? "WA" : firstFail.outcome;
  return {
    verdict,
    summary: { totalTests: results.length, passedTests: passed, failedTests: results.length - passed },
  };
}
