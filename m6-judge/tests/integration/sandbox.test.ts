import { describe, it, expect, beforeAll } from "bun:test";
import { executeSubmission } from "../../src/judge/execute";
import { runInSandbox, buildDockerArgs } from "../../src/sandbox/docker";
import { clampLimits } from "../../src/domain/limits";
import type { JudgePackage } from "../../src/domain/validate";
import { IMAGES } from "../../src/sandbox/images";

const limits = clampLimits(undefined);
const pkg = (tests: Array<[string, string]>): JudgePackage => ({
  packageId: "sum",
  version: 1,
  comparisonMode: "exact",
  testCases: tests.map(([stdin, expectedOutput], i) => ({ testCaseId: `t${i}`, stdin, expectedOutput })),
});
const run = (language: "python" | "cpp", sourceCode: string, tests: Array<[string, string]>) =>
  executeSubmission({ language, sourceCode, pkg: pkg(tests), limits, run: runInSandbox });

const sh = (cmd: string[]) => Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
const leaked = () =>
  new TextDecoder()
    .decode(sh(["docker", "ps", "-a", "-q", "--filter", "label=m6.judge=sandbox"]).stdout)
    .trim();

beforeAll(() => {
  const root = `${import.meta.dir}/../../runners`;
  for (const [tag, file] of [
    [IMAGES.python, "python.Dockerfile"],
    [IMAGES.cpp, "cpp.Dockerfile"],
  ] as const) {
    const r = sh(["docker", "build", "-t", tag, "-f", `${root}/${file}`, root]);
    if (r.exitCode !== 0) throw new Error(`build ${tag} failed: ${new TextDecoder().decode(r.stderr)}`);
  }
}, 900_000);

describe("sandbox: python", () => {
  const sum = "a,b=map(int,input().split())\nprint(a+b,end='')";
  it("should produce AC for a correct solution", async () => {
    const r = await run("python", sum, [["2 3\n", "5"], ["10 -4\n", "6"]]);
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "AC" });
  }, 60_000);

  it("should produce WA for a wrong solution", async () => {
    const r = await run("python", "print(0,end='')", [["2 3\n", "5"]]);
    expect(r).toMatchObject({ verdict: "WA" });
  }, 60_000);

  it("should produce RTE for a crashing solution", async () => {
    const r = await run("python", "raise SystemExit(3)", [["", ""]]);
    expect(r).toMatchObject({ verdict: "RTE" });
  }, 60_000);

  it("should produce TLE for an infinite loop within ~3s + startup", async () => {
    const t = Date.now();
    const r = await run("python", "while True: pass", [["", ""]]);
    expect(r).toMatchObject({ verdict: "TLE" });
    expect(Date.now() - t).toBeLessThan(15_000);
  }, 60_000);

  it("should block outbound network access", async () => {
    const src = "import socket\ntry:\n s=socket.create_connection(('1.1.1.1',53),timeout=2)\n print('NET',end='')\nexcept Exception:\n print('BLOCKED',end='')";
    const r = await run("python", src, [["", "BLOCKED"]]);
    expect(r).toMatchObject({ verdict: "AC" });
  }, 60_000);

  it("should not expose the host filesystem, docker socket or write to root fs", async () => {
    const src = [
      "import os",
      "r=[]",
      "r.append(os.path.exists('/var/run/docker.sock'))",
      "r.append(os.path.exists('/mnt/c'))",
      "try:",
      " open('/etc/pwned','w').write('x'); r.append(True)",
      "except Exception: r.append(False)",
      "print(r,end='')",
    ].join("\n");
    const r = await run("python", src, [["", "[False, False, False]"]]);
    expect(r).toMatchObject({ verdict: "AC" });
  }, 60_000);

  it("should run as a non-root user", async () => {
    const r = await run("python", "import os\nprint(os.getuid(),end='')", [["", "10001"]]);
    expect(r).toMatchObject({ verdict: "AC" });
  }, 60_000);

  it("should kill a memory hog (>128MB) as RTE with memory event", async () => {
    const r = await run("python", "x=bytearray(400*1024*1024)\nprint(len(x))", [["", "x"]]);
    expect(r).toMatchObject({ verdict: "RTE" });
  }, 60_000);

  it("should contain a fork bomb via the pids limit and still finish", async () => {
    const src = "import os\nfor _ in range(500):\n try:\n  if os.fork()==0:\n   import time; time.sleep(10); os._exit(0)\n except OSError: print('LIMITED',end=''); break";
    const r = await run("python", src, [["", "LIMITED"]]);
    expect(r).toMatchObject({ executionStatus: "completed" });
  }, 60_000);

  it("should stop output floods as RTE", async () => {
    const r = await run("python", "import sys\nwhile True: sys.stdout.write('A'*65536)", [["", ""]]);
    expect(r).toMatchObject({ verdict: expect.stringMatching(/RTE|TLE/) });
  }, 60_000);

  it("should remove every sandbox container after all of the above", () => {
    expect(leaked()).toBe("");
  });
});

describe("sandbox: c++", () => {
  const sum = "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}";
  it("should produce AC for a correct solution", async () => {
    const r = await run("cpp", sum, [["2 3\n", "5"], ["7 8\n", "15"]]);
    expect(r).toMatchObject({ executionStatus: "completed", verdict: "AC" });
  }, 120_000);

  it("should produce CE with a safe message for a syntax error", async () => {
    const r = await run("cpp", "int main(){ return 0 }", [["", ""]]);
    expect(r).toMatchObject({ verdict: "CE" });
    if (r.executionStatus === "completed") {
      expect(r.diagnostics.compileMessage).toContain("error");
      expect(r.diagnostics.compileMessage).not.toContain("/tmp/");
    }
  }, 120_000);

  it("should produce TLE for an infinite loop", async () => {
    const r = await run("cpp", "int main(){ for(;;){} }", [["", ""]]);
    expect(r).toMatchObject({ verdict: "TLE" });
  }, 120_000);

  it("should produce RTE for a segfault", async () => {
    const r = await run("cpp", "int main(){ int*p=0; *p=1; }", [["", ""]]);
    expect(r).toMatchObject({ verdict: "RTE" });
  }, 120_000);

  it("should leave no containers behind", () => {
    expect(leaked()).toBe("");
  });
});

describe("sandbox: infrastructure failure", () => {
  it("should report SANDBOX_UNAVAILABLE when the image does not exist (never a verdict)", async () => {
    const r = await executeSubmission({
      language: "python",
      sourceCode: "print(1)",
      pkg: pkg([["", "1"]]),
      limits,
      run: (o) => runInSandbox({ ...o, image: "m6-does-not-exist:local" }),
    });
    expect(r.executionStatus).toBe("failed");
    expect("verdict" in r).toBe(false);
  }, 60_000);

  it("should keep argv free of learner-controlled strings", () => {
    const args = buildDockerArgs(
      {
        image: IMAGES.python,
        mode: "py",
        stdin: Buffer.from("; rm -rf / #"),
        timeLimitMs: 3000,
        memoryMb: 128,
        cpus: 1,
        pids: 64,
        tmpfsMb: 32,
        maxStdoutBytes: 1,
        maxStderrBytes: 1,
      },
      "n",
    );
    expect(args.join(" ")).not.toContain("rm -rf");
  });
});
