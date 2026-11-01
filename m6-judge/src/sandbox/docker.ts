export interface SandboxRunOptions {
  image: string;
  mode: "py" | "cpp-compile" | "bin-run";
  /** Already framed stdin (see frameStdin). */
  stdin: Buffer;
  timeLimitMs: number;
  memoryMb: number;
  cpus: number;
  pids: number;
  tmpfsMb: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
}

export interface SandboxRunResult {
  exitCode: number;
  timedOut: boolean;
  stdout: Buffer;
  stdoutExceeded: boolean;
  stderr: string;
  durationMs: number;
}

/** Docker/daemon/image problem — an infrastructure failure, never a learner verdict. */
export class SandboxUnavailableError extends Error {}

/** Extra wall-clock slack on top of the in-container timeout for container start/teardown. */
const WALL_GRACE_MS = 5000;

/** Frame payload + program stdin: "<bytes>\n<payload><stdin>". No bind mounts needed. */
export function frameStdin(payload: Buffer, programStdin: string | Buffer): Buffer {
  return Buffer.concat([Buffer.from(`${payload.length}\n`), payload, Buffer.from(programStdin)]);
}

/** Pure builder of the docker argv (argument array, never a shell string). */
export function buildDockerArgs(o: SandboxRunOptions, name: string): string[] {
  const tl = String(o.timeLimitMs / 1000);
  return [
    "run", "--rm", "-i",
    "--name", name,
    "--label", "m6.judge=sandbox",
    "--pull", "never",
    "--network", "none",
    "--cpus", String(o.cpus),
    "--memory", `${o.memoryMb}m`,
    "--memory-swap", `${o.memoryMb}m`,
    "--pids-limit", String(o.pids),
    "--ulimit", "nofile=256:256",
    "--read-only",
    "--tmpfs", `/tmp:rw,exec,nosuid,nodev,size=${o.tmpfsMb}m,mode=1777`,
    "--user", "10001:10001",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "-e", `TL=${tl}`,
    o.image,
    o.mode,
  ];
}

async function readCapped(stream: ReadableStream<Uint8Array>, max: number, onExceed: () => void) {
  const chunks: Uint8Array[] = [];
  let size = 0;
  let exceeded = false;
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (exceeded) continue; // drain
    size += value.length;
    if (size > max) {
      exceeded = true;
      chunks.push(value.slice(0, Math.max(0, value.length - (size - max))));
      onExceed();
    } else chunks.push(value);
  }
  return { buf: Buffer.concat(chunks), exceeded };
}

async function forceRemove(name: string) {
  try {
    const p = Bun.spawn(["docker", "rm", "-f", name], { stdout: "ignore", stderr: "ignore" });
    await p.exited;
  } catch {
    /* best effort */
  }
}

export async function runInSandbox(o: SandboxRunOptions): Promise<SandboxRunResult> {
  const name = `judge-sbx-${crypto.randomUUID()}`;
  const started = Date.now();
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(["docker", ...buildDockerArgs(o, name)], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (e) {
    throw new SandboxUnavailableError(`cannot spawn docker: ${(e as Error).message}`);
  }

  let timedOut = false;
  const wall = setTimeout(() => {
    timedOut = true;
    void forceRemove(name);
  }, o.timeLimitMs + WALL_GRACE_MS);

  try {
    const stdinSink = proc.stdin as import("bun").FileSink;
    try {
      stdinSink.write(o.stdin);
      await stdinSink.end();
    } catch {
      /* container may exit before reading all stdin */
    }
    const kill = () => void forceRemove(name);
    const [out, err] = await Promise.all([
      readCapped(proc.stdout as ReadableStream<Uint8Array>, o.maxStdoutBytes, kill),
      readCapped(proc.stderr as ReadableStream<Uint8Array>, o.maxStderrBytes, () => {}),
    ]);
    const exitCode = await proc.exited;
    // 125/126/127: docker itself failed (daemon error, image missing, bad entrypoint).
    if (!timedOut && !out.exceeded && (exitCode === 125 || exitCode === 126 || exitCode === 127)) {
      throw new SandboxUnavailableError(`docker failed (exit ${exitCode})`);
    }
    return {
      exitCode,
      timedOut,
      stdout: out.buf,
      stdoutExceeded: out.exceeded,
      stderr: err.buf.toString("utf8"),
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(wall);
    await forceRemove(name); // cleanup on every terminal path
  }
}
