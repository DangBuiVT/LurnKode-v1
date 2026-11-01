export interface ServiceToken {
  id: string;
  token: string;
  scopes: string[];
}

/** "m3:token:submit,read;ops:token2:read" */
export function parseServiceTokens(raw: string | undefined): ServiceToken[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, token, scopes = ""] = entry.split(":");
      if (!id || !token) throw new Error("Invalid SERVICE_TOKENS entry");
      return { id, token, scopes: scopes.split(",").map((x) => x.trim()).filter(Boolean) };
    });
}

export const env = {
  databaseUrl: () => process.env.DATABASE_URL ?? "postgres://judge:judge@localhost:5432/judge",
  redisUrl: () => process.env.REDIS_URL ?? "redis://localhost:6379",
  port: (def: number) => Number(process.env.PORT ?? def),
  callbackUrl: () => process.env.CALLBACK_URL ?? "http://localhost:3000/internal/v1/judge-results",
  callbackToken: () => process.env.CALLBACK_TOKEN ?? "dev-callback-token",
};
