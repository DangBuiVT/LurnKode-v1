import { describe, expect, it } from "bun:test";
import {
  validateAdminBootstrapTarget,
  validateLocalComposeDatabase,
  validateLocalComposeDatabaseInspection,
} from "@/scripts/admin-bootstrap-guard";

describe("M1 first-admin bootstrap target guard", () => {
  it("accepts the explicitly confirmed local development database", () => {
    expect(validateAdminBootstrapTarget("postgresql://localhost:5432/lurnkode_db", true))
      .toEqual({ host: "localhost", port: 5432, database: "lurnkode_db" });
  });

  it("rejects a missing explicit confirmation flag", () => {
    expect(() => validateAdminBootstrapTarget("postgresql://localhost:5432/lurnkode_db", false))
      .toThrow("--confirm-local-dev");
  });

  it("rejects databases outside the fixed local database name", () => {
    expect(() => validateAdminBootstrapTarget("postgresql://localhost:5432/production", true))
      .toThrow("lurnkode_db");
  });

  it("rejects a remote database host even when the operator supplied the flag", () => {
    expect(() => validateAdminBootstrapTarget("postgresql://db.example.com:5432/lurnkode_db", true))
      .toThrow("local development database");
  });

  it("rejects non-PostgreSQL connection schemes", () => {
    expect(() => validateAdminBootstrapTarget("https://localhost:5432/lurnkode_db", true))
      .toThrow("PostgreSQL");
  });

  it("rejects a Compose DNS hostname when the CLI is not using the host-published local port", () => {
    expect(() => validateAdminBootstrapTarget("postgresql://postgres:5432/lurnkode_db", true))
      .toThrow("local development database");
  });

  it("requires Docker metadata for this workspace, named volume and published target port", () => {
    expect(() => validateLocalComposeDatabase(
      {
        "com.docker.compose.project": "lurnkode",
        "com.docker.compose.service": "postgres",
        "com.docker.compose.project.working_dir": "d:/LurnKode/",
        "com.docker.compose.project.config_files": "D:/lUrNkOdE/docker-compose.yml",
      },
      ["POSTGRES_DB=lurnkode_db"],
      [{ Type: "volume", Name: "lurnkode_postgres_data", Destination: "/var/lib/postgresql/data" }],
      { "5432/tcp": [
        { HostIp: "0.0.0.0", HostPort: "5432" },
        { HostIp: "::", HostPort: "5432" },
      ] },
      "D:\\LurnKode\\",
      5432,
    )).not.toThrow();

    expect(() => validateLocalComposeDatabase(
      { "com.docker.compose.project": "lurnkode" }, [], [], {}, "D:\\LurnKode", 5432,
    )).toThrow("service must be postgres");
  });

  it("rejects a target port that differs from the Compose published PostgreSQL port", () => {
    expect(() => validateLocalComposeDatabase(
      {
        "com.docker.compose.project": "lurnkode",
        "com.docker.compose.service": "postgres",
        "com.docker.compose.project.working_dir": "D:\\LurnKode",
        "com.docker.compose.project.config_files": "D:\\LurnKode\\docker-compose.yml",
      },
      ["POSTGRES_DB=lurnkode_db"],
      [{ Type: "volume", Name: "lurnkode_postgres_data", Destination: "/var/lib/postgresql/data" }],
      { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] },
      "D:\\LurnKode",
      5433,
    )).toThrow("Published PostgreSQL port does not match DATABASE_URL port 5433.");
  });

  it("rejects a volume mount that is not the project's existing PostgreSQL volume", () => {
    expect(() => validateLocalComposeDatabase(
      {
        "com.docker.compose.project": "lurnkode",
        "com.docker.compose.service": "postgres",
        "com.docker.compose.project.working_dir": "D:\\LurnKode",
        "com.docker.compose.project.config_files": "D:\\LurnKode\\docker-compose.yml",
      },
      ["POSTGRES_DB=lurnkode_db"],
      [{ Type: "volume", Name: "other_volume", Destination: "/var/lib/postgresql/data" }],
      { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] },
      "D:\\LurnKode",
      5432,
    )).toThrow("expected lurnkode_postgres_data volume");
  });

  it("parses Docker inspection as JSON even when an environment value contains a pipe", () => {
    const inspection = JSON.stringify({
      Config: {
        Labels: {
          "com.docker.compose.project": "lurnkode",
          "com.docker.compose.service": "postgres",
          "com.docker.compose.project.working_dir": "D:\\LurnKode",
          "com.docker.compose.project.config_files": "D:\\LurnKode\\docker-compose.yml",
        },
        Env: ["POSTGRES_DB=lurnkode_db", "POSTGRES_PASSWORD=contains|delimiter"],
      },
      Mounts: [{ Type: "volume", Name: "lurnkode_postgres_data", Destination: "/var/lib/postgresql/data" }],
      NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] } },
    });

    expect(() => validateLocalComposeDatabaseInspection(inspection, "D:\\LurnKode", 5432)).not.toThrow();
  });
});
