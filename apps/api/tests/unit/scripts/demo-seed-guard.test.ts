import { describe, expect, it } from "bun:test";
import { validateLocalApiBase, validateLocalDemoDatabase } from "@/scripts/demo-seed-guard";

describe("local demo seed guards", () => {
  it("allows only the explicitly confirmed local demo database", () => {
    expect(validateLocalDemoDatabase("postgresql://localhost:5432/lurnkode_db", "lurnkode_db"))
      .toEqual({ host: "localhost", port: 5432, database: "lurnkode_db" });
  });

  it("requires explicit local database confirmation", () => {
    expect(() => validateLocalDemoDatabase("postgresql://localhost:5432/lurnkode_db", undefined))
      .toThrow("no seed writes were made");
  });

  it("rejects remote database hosts even with the database name confirmation", () => {
    expect(() => validateLocalDemoDatabase("postgresql://db.example.com:5432/lurnkode_db", "lurnkode_db"))
      .toThrow("localhost:5432/lurnkode_db");
  });

  it("rejects a different local database", () => {
    expect(() => validateLocalDemoDatabase("postgresql://localhost:5432/production", "lurnkode_db"))
      .toThrow("localhost:5432/lurnkode_db");
  });

  it("allows only the local API endpoint", () => {
    expect(validateLocalApiBase("http://localhost:8000")).toBe("http://localhost:8000");
    expect(() => validateLocalApiBase("https://api.example.com")).toThrow("local API");
  });
});
