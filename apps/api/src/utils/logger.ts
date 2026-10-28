type LogLevel = "debug" | "info" | "warn" | "error";
type LogRecord = Record<string, unknown>;

const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|database[-_]?url|connection[-_]?string)/i;
const REDACTED = "[REDACTED]";

export function redactSensitiveFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSensitiveFields(item)) as T;
  if (value instanceof Error) {
    return { name: value.name, message: value.message } as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redactSensitiveFields(item),
      ]),
    ) as T;
  }
  return value;
}

export interface Logger {
  debug(message: string, fields?: LogRecord): void;
  info(message: string, fields?: LogRecord): void;
  warn(message: string, fields?: LogRecord): void;
  error(message: string, fields?: LogRecord): void;
}

export function createLogger(options: { level?: LogLevel; environment?: string } = {}): Logger {
  const threshold = options.level ?? (options.environment === "production" ? "info" : "debug");
  const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  const write = (level: LogLevel, message: string, fields: LogRecord = {}): void => {
    if (priorities[level] < priorities[threshold]) return;
    const record = redactSensitiveFields({ time: new Date().toISOString(), level, message, ...fields });
    const line = JSON.stringify(record);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}

const nodeEnv = process.env.NODE_ENV;
export const logger = createLogger(nodeEnv !== undefined ? { environment: nodeEnv } : {});
