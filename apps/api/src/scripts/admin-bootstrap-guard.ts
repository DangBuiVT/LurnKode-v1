const normalizePath = (value: string) => value.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
const DATABASE_NAME = "lurnkode_db";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface AdminBootstrapTarget {
  host: string;
  port: number;
  database: string;
}
export function validateAdminBootstrapTarget(
  databaseUrl: string | undefined,
  confirmed: boolean,
): AdminBootstrapTarget {
  if (!confirmed) throw new Error("Pass --confirm-local-dev to enable the one-time Admin bootstrap.");
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }

  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use a PostgreSQL connection scheme.");
  }

  const host = target.hostname.toLowerCase();
  const isLoopback = LOCAL_HOSTS.has(host);
  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  const port = target.port ? Number(target.port) : 5432;

  if (!isLoopback) {
    throw new Error("Admin bootstrap is restricted to a local development database host.");
  }
  if (database !== DATABASE_NAME) {
    throw new Error(`Admin bootstrap is restricted to database ${DATABASE_NAME}.`);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DATABASE_URL has an invalid PostgreSQL port.");
  }

  return { host, port, database };
}

export function validateLocalComposeDatabase(
  labels: Record<string, string>,
  environment: string[],
  mounts: Array<{ Type: string; Name?: string; Destination: string }>,
  portBindings: Record<string, Array<{ HostIp: string; HostPort: string }> | null>,
  repositoryRoot: string,
  targetPort: number,
): void {
  const configuredDatabase = environment.find((entry) => entry.startsWith("POSTGRES_DB="))?.slice("POSTGRES_DB=".length);
  const projectDirectory = labels["com.docker.compose.project.working_dir"];
  const configuredFiles = labels["com.docker.compose.project.config_files"]?.split(",") ?? [];
  const expectedComposeFile = `${normalizePath(repositoryRoot)}/docker-compose.yml`;
  const hasExpectedComposeFile = configuredFiles.some((file) => normalizePath(file) === expectedComposeFile);
  const hasExpectedVolume = mounts.some((mount) =>
    mount.Type === "volume" && mount.Name === "lurnkode_postgres_data" && mount.Destination === "/var/lib/postgresql/data",
  );
  const publishedPorts = portBindings["5432/tcp"] ?? [];
  const hasExpectedPort = publishedPorts.some((binding) => Number(binding.HostPort) === targetPort);

  if (labels["com.docker.compose.project"] !== "lurnkode") throw new Error("Docker Compose project must be lurnkode.");
  if (labels["com.docker.compose.service"] !== "postgres") throw new Error("Docker Compose service must be postgres.");
  if (!projectDirectory || normalizePath(projectDirectory) !== normalizePath(repositoryRoot)) {
    throw new Error("Docker Compose working directory does not match this workspace.");
  }
  if (!hasExpectedComposeFile) throw new Error("Docker Compose config file does not match this workspace.");
  if (configuredDatabase !== DATABASE_NAME) throw new Error(`Docker PostgreSQL service must use database ${DATABASE_NAME}.`);
  if (!hasExpectedVolume) throw new Error("Docker PostgreSQL service must use the expected lurnkode_postgres_data volume.");
  if (!hasExpectedPort) throw new Error(`Published PostgreSQL port does not match DATABASE_URL port ${targetPort}.`);
}

interface LocalComposeInspection {
  Config?: {
    Labels?: Record<string, string>;
    Env?: string[];
  };
  Mounts?: Array<{ Type: string; Name?: string; Destination: string }>;
  NetworkSettings?: {
    Ports?: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
  };
}

export function validateLocalComposeDatabaseInspection(
  inspectionJson: string,
  repositoryRoot: string,
  targetPort: number,
): void {
  let inspection: LocalComposeInspection;
  try {
    inspection = JSON.parse(inspectionJson) as LocalComposeInspection;
  } catch {
    throw new Error("Docker returned invalid PostgreSQL inspection JSON.");
  }

  validateLocalComposeDatabase(
    inspection.Config?.Labels ?? {},
    inspection.Config?.Env ?? [],
    inspection.Mounts ?? [],
    inspection.NetworkSettings?.Ports ?? {},
    repositoryRoot,
    targetPort,
  );
}
