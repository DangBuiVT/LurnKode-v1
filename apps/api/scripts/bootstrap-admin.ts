import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { closeDatabaseConnection } from "../src/db";
import * as userRepository from "../src/repositories/user.repository";
import { bootstrapFirstAdmin } from "../src/services/user.service";
import { validateAdminBootstrapTarget, validateLocalComposeDatabase } from "../src/scripts/admin-bootstrap-guard";

const CONFIRM_FLAG = "--confirm-local-dev";
const CONFIRM_PHRASE = "BOOTSTRAP FIRST ADMIN";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function assertWorkspaceDockerContext(): void {
  try {
    const context = execFileSync("docker", ["context", "show"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (context !== "default" && context !== "desktop-linux") {
      throw new Error("Docker context is not a supported local context.");
    }
    const endpoint = execFileSync("docker", ["context", "inspect", "--format", "{{ .Endpoints.docker.Host }}", context], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!endpoint.startsWith("unix://") && !endpoint.startsWith("npipe://")) {
      throw new Error("Docker context endpoint is not a local socket.");
    }
  } catch {
    throw new Error("Could not verify a local Docker Desktop/Engine context; Admin bootstrap was stopped.");
  }
}

function assertLocalComposeDatabase(targetPort: number): void {
  assertWorkspaceDockerContext();
  try {
    const output = execFileSync("docker", [
      "inspect", "--format", "{{json .Config.Labels}}|{{json .Config.Env}}|{{json .Mounts}}|{{json .NetworkSettings.Ports}}", "lurnkode-postgres",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const [labelsText, environmentText, mountsText, portsText] = output.split("|");
    validateLocalComposeDatabase(
      JSON.parse(labelsText || "{}"),
      JSON.parse(environmentText || "[]"),
      JSON.parse(mountsText || "[]"),
      JSON.parse(portsText || "{}"),
      repositoryRoot,
      targetPort,
    );
  } catch {
    throw new Error("Could not verify this workspace's local lurnkode PostgreSQL Compose service; Admin bootstrap was stopped.");
  }
}

async function readLine(prompt: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question(prompt)).trim();
  } finally {
    readline.close();
  }
}

async function readHiddenPassword(): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Admin bootstrap requires an interactive terminal for hidden password entry.");
  }

  stdout.write("New Admin password (hidden, 8-128 characters): ");
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise<string>((resolve, reject) => {
    let password = "";
    const finish = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Admin bootstrap cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          password = [...password].slice(0, -1).join("");
          continue;
        }
        if (character >= " " && character !== "\u007f") password += character;
      }
    };
    stdin.on("data", onData);
  });
}

function parseArguments(arguments_: string[]): void {
  if (arguments_.length !== 1 || arguments_[0] !== CONFIRM_FLAG) {
    throw new Error(`Usage: bun run db:bootstrap-admin -- ${CONFIRM_FLAG}`);
  }
}

async function main(): Promise<void> {
  parseArguments(process.argv.slice(2));
  const target = validateAdminBootstrapTarget(process.env.DATABASE_URL, true);
  assertLocalComposeDatabase(target.port);

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Admin bootstrap requires an interactive terminal; piped input is not accepted.");
  }

  console.log(`Target: ${target.host}:${target.port}/${target.database} (local-development allowlist).`);
  const confirmation = await readLine(`Type ${CONFIRM_PHRASE} to continue: `);
  if (confirmation !== CONFIRM_PHRASE) throw new Error("Interactive confirmation did not match; no Admin was created.");

  if (await userRepository.countAdminAccounts() > 0) {
    throw new Error("An Admin account already exists (active or inactive); bootstrap is one-time only.");
  }

  const email = (await readLine("First Admin email: ")).toLowerCase();
  const fullName = await readLine("First Admin full name: ");
  const password = await readHiddenPassword();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid Admin email is required.");
  if (fullName.length < 1 || fullName.length > 150) throw new Error("Admin full name must contain 1-150 characters.");
  if (password.length < 8 || password.length > 128) throw new Error("Admin password must contain 8-128 characters.");

  const admin = await bootstrapFirstAdmin({ email, fullName, password });
  console.log(`Created the first active M1 Admin (${admin.id}). Password was neither printed nor saved.`);
  console.log("Next: verify with POST /api/v1/auth/login, then run the E2E demo seed with that Admin session.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
