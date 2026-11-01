export interface RuntimeLimits {
  cpuCores: number;
  memoryLimitMb: number;
  timeLimitMs: number;
}

/** Server-side hard ceilings (proposal baseline: 1 CPU, 128 MB, 3 s). Callers can only lower them. */
export const POLICY = {
  cpuCores: 1,
  memoryLimitMb: 128,
  timeLimitMs: 3000,
  maxSourceBytes: 64 * 1024,
  maxTestCases: 50,
  maxPackageBytes: 1024 * 1024,
  /** C++ compilation limits are separate from runtime limits. */
  compile: { memoryLimitMb: 512, timeLimitMs: 10_000 },
  /** Per-run output-size limit for judging (nothing here is ever returned to learners). */
  maxStdoutBytes: 64 * 1024,
  maxStderrBytes: 1024,
} as const;

export function clampLimits(requested: Partial<RuntimeLimits> | undefined): RuntimeLimits {
  const pick = (v: number | undefined, max: number) =>
    typeof v === "number" && v > 0 ? Math.min(v, max) : max;
  return {
    cpuCores: pick(requested?.cpuCores, POLICY.cpuCores),
    memoryLimitMb: pick(requested?.memoryLimitMb, POLICY.memoryLimitMb),
    timeLimitMs: pick(requested?.timeLimitMs, POLICY.timeLimitMs),
  };
}
