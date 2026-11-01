const EXPECTED_DATABASE = "lurnkode_db";

export function validateLocalDemoDatabase(databaseUrl: string | undefined, confirmation: string | undefined) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required; no seed writes were made.");
  if (confirmation !== EXPECTED_DATABASE) {
    throw new Error(`Set DEMO_SEED_CONFIRM_DB=${EXPECTED_DATABASE} to confirm the local target; no seed writes were made.`);
  }

  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid; no seed writes were made.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (!localHosts.has(target.hostname) || databaseName !== EXPECTED_DATABASE || target.port !== "5432") {
    throw new Error("Seed is restricted to localhost:5432/lurnkode_db; no seed writes were made.");
  }

  return { host: target.hostname, port: Number(target.port), database: databaseName };
}

export function validateLocalApiBase(apiBaseUrl: string) {
  let target: URL;
  try {
    target = new URL(apiBaseUrl);
  } catch {
    throw new Error("API_BASE_URL is invalid; no seed writes were made.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (target.protocol !== "http:" || !localHosts.has(target.hostname) || target.port !== "8000") {
    throw new Error("Seed is restricted to the local API at http://localhost:8000; no seed writes were made.");
  }
  return target.origin;
}
