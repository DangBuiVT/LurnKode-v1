function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${key}`);
  return value.trim();
}

const port = Number(required("PORT", "8000"));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

export const env = {
  PORT: port,
  HOST: process.env.HOST?.trim() || "0.0.0.0",
  NODE_ENV: required("NODE_ENV", "development"),
  DATABASE_URL: required("DATABASE_URL"),
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY?.trim() ?? "",
  ALLOWED_ORIGINS: required("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
