import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { createLogger, redactSensitiveFields } from "@/utils/logger";

// ─── redactSensitiveFields ────────────────────────────────────────────────────

describe("redactSensitiveFields", () => {
  it("redacts password field", () => {
    const result = redactSensitiveFields({ password: "s3cr3t", name: "Alice" });
    expect(result.password).toBe("[REDACTED]");
    expect(result.name).toBe("Alice");
  });

  it("redacts token field", () => {
    const result = redactSensitiveFields({ token: "abc123", userId: "1" });
    expect(result.token).toBe("[REDACTED]");
    expect(result.userId).toBe("1");
  });

  it("redacts authorization field", () => {
    const result = redactSensitiveFields({ authorization: "Bearer xyz", method: "GET" });
    expect(result.authorization).toBe("[REDACTED]");
  });

  it("redacts secret field", () => {
    const result = redactSensitiveFields({ secret: "topsecret" });
    expect(result.secret).toBe("[REDACTED]");
  });

  it("redacts cookie field", () => {
    const result = redactSensitiveFields({ cookie: "session=abc" });
    expect(result.cookie).toBe("[REDACTED]");
  });

  it("redacts api_key and apiKey variants", () => {
    const result = redactSensitiveFields({ api_key: "key1", apiKey: "key2" });
    expect(result.api_key).toBe("[REDACTED]");
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("redacts private_key and privateKey variants", () => {
    const result = redactSensitiveFields({ private_key: "pem", privateKey: "pem2" });
    expect(result.private_key).toBe("[REDACTED]");
    expect(result.privateKey).toBe("[REDACTED]");
  });

  it("redacts database_url and databaseUrl variants", () => {
    const result = redactSensitiveFields({ database_url: "postgres://...", databaseUrl: "postgres://..." });
    expect(result.database_url).toBe("[REDACTED]");
    expect(result.databaseUrl).toBe("[REDACTED]");
  });

  it("does not redact unrelated fields", () => {
    const result = redactSensitiveFields({ name: "Alice", email: "a@b.com", role: "Admin" });
    expect(result).toEqual({ name: "Alice", email: "a@b.com", role: "Admin" });
  });

  it("recursively redacts nested objects", () => {
    const result = redactSensitiveFields({ user: { password: "s3cr3t", name: "Bob" } });
    expect(result.user.password).toBe("[REDACTED]");
    expect(result.user.name).toBe("Bob");
  });

  it("recursively redacts inside arrays", () => {
    const result = redactSensitiveFields([{ token: "abc" }, { name: "Alice" }]);
    expect(result[0]!.token).toBe("[REDACTED]");
    expect(result[1]!.name).toBe("Alice");
  });

  it("handles Error objects — returns only name and message", () => {
    const err = new Error("Something went wrong");
    const result = redactSensitiveFields(err);
    expect((result as { name: string; message: string }).name).toBe("Error");
    expect((result as { name: string; message: string }).message).toBe("Something went wrong");
  });

  it("passes through null without error", () => {
    expect(redactSensitiveFields(null)).toBeNull();
  });

  it("passes through primitives unchanged", () => {
    expect(redactSensitiveFields(42)).toBe(42);
    expect(redactSensitiveFields("hello")).toBe("hello");
    expect(redactSensitiveFields(true)).toBe(true);
    expect(redactSensitiveFields(undefined)).toBeUndefined();
  });

  it("is case-insensitive for key matching", () => {
    const result = redactSensitiveFields({ PASSWORD: "x", Token: "y", SECRET_KEY: "z" });
    expect(result.PASSWORD).toBe("[REDACTED]");
    expect(result.Token).toBe("[REDACTED]");
    expect(result.SECRET_KEY).toBe("[REDACTED]");
  });
});

// ─── createLogger ─────────────────────────────────────────────────────────────

describe("createLogger", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let warnSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("emits JSON to console.log for info level", () => {
    const log = createLogger({ level: "info" });
    log.info("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const record = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(record.level).toBe("info");
    expect(record.message).toBe("hello");
  });

  it("emits to console.warn for warn level", () => {
    const log = createLogger({ level: "debug" });
    log.warn("careful");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("emits to console.error for error level", () => {
    const log = createLogger({ level: "debug" });
    log.error("boom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("suppresses logs below threshold", () => {
    const log = createLogger({ level: "warn" });
    log.debug("verbose");
    log.info("info");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses info threshold in production environment", () => {
    const log = createLogger({ environment: "production" });
    log.debug("debug in prod");
    expect(logSpy).not.toHaveBeenCalled();
    log.info("info in prod");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("uses debug threshold in development environment", () => {
    const log = createLogger({ environment: "development" });
    log.debug("debug in dev");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("redacts sensitive fields in log output", () => {
    const log = createLogger({ level: "info" });
    log.info("auth event", { password: "s3cr3t", userId: "123" });
    const record = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(record.password).toBe("[REDACTED]");
    expect(record.userId).toBe("123");
  });

  it("includes time field in every log record", () => {
    const log = createLogger({ level: "info" });
    log.info("ping");
    const record = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(typeof record.time).toBe("string");
    expect(() => new Date(record.time as string)).not.toThrow();
  });
});
