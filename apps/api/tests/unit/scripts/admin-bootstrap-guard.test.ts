import { describe, expect, it } from "bun:test";
import { validateAdminBootstrapTarget, validateLocalComposeDatabase } from "@/scripts/admin-bootstrap-guard";

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
        "com.docker.compose.project.working_dir": "D:\\LurnKode",
        "com.docker.compose.project.config_files": "D:\\LurnKode\\docker-compose.yml",
      },
      ["POSTGRES_DB=lurnkode_db"],
      [{ Type: "volume", Name: "lurnkode_postgres_data", Destination: "/var/lib/postgresql/data" }],
      { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "5432" }] },
      "D:\\LurnKode",
      5432,
    )).not.toThrow();

    expect(() => validateLocalComposeDatabase(
      { "com.docker.compose.project": "lurnkode" }, [], [], {}, "D:\\LurnKode", 5432,
    )).toThrow("Docker metadata");
  });
});
