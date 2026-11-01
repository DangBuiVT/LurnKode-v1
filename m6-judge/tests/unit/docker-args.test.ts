import { describe, it, expect } from "bun:test";
import { buildDockerArgs, frameStdin, type SandboxRunOptions } from "../../src/sandbox/docker";

const opts = (over: Partial<SandboxRunOptions> = {}): SandboxRunOptions => ({
  image: "m6-python-runner:local",
  mode: "py",
  stdin: Buffer.from("x"),
  timeLimitMs: 3000,
  memoryMb: 128,
  cpus: 1,
  pids: 64,
  tmpfsMb: 32,
  maxStdoutBytes: 65536,
  maxStderrBytes: 1024,
  ...over,
});

describe("buildDockerArgs", () => {
  const args = buildDockerArgs(opts(), "judge-sbx-test");
  const has = (...seq: string[]) =>
    args.some((_, i) => seq.every((s, j) => args[i + j] === s));

  it("should disable the network", () => expect(has("--network", "none")).toBe(true));
  it("should apply cpu, memory and pids limits", () => {
    expect(has("--cpus", "1")).toBe(true);
    expect(has("--memory", "128m")).toBe(true);
    expect(has("--memory-swap", "128m")).toBe(true);
    expect(has("--pids-limit", "64")).toBe(true);
  });
  it("should run read-only, non-root, without capabilities or privilege escalation", () => {
    expect(args).toContain("--read-only");
    expect(has("--user", "10001:10001")).toBe(true);
    expect(has("--cap-drop", "ALL")).toBe(true);
    expect(has("--security-opt", "no-new-privileges")).toBe(true);
  });
  it("should never be privileged and never mount anything", () => {
    expect(args).not.toContain("--privileged");
    expect(args).not.toContain("-v");
    expect(args).not.toContain("--volume");
    expect(args.some((a) => a.startsWith("--mount"))).toBe(false);
    expect(args.join(" ")).not.toContain("docker.sock");
  });
  it("should give a bounded exec tmpfs for /tmp", () => {
    expect(args.some((a) => a.startsWith("/tmp:") && a.includes("size=32m") && a.includes("exec"))).toBe(true);
  });
  it("should pass the time limit to the runner in seconds and never pull images", () => {
    expect(has("-e", "TL=3")).toBe(true);
    expect(has("--pull", "never")).toBe(true);
  });
  it("should name and label the container for cleanup tracking", () => {
    expect(has("--name", "judge-sbx-test")).toBe(true);
    expect(has("--label", "m6.judge=sandbox")).toBe(true);
  });
  it("should end with image then mode as plain argv (no shell)", () => {
    expect(args.slice(-2)).toEqual(["m6-python-runner:local", "py"]);
  });
  it("should convert sub-second limits to fractional seconds", () => {
    expect(buildDockerArgs(opts({ timeLimitMs: 500 }), "n")).toContain("TL=0.5");
  });
});

describe("frameStdin", () => {
  it("should prefix payload with its byte length and a newline, then append program stdin", () => {
    const out = frameStdin(Buffer.from("héllo"), "in\n").toString();
    expect(out).toBe("6\nhéllo" + "in\n");
  });
});
