import { createApp } from "./app";
import { env, parseServiceTokens } from "../config";
import { connectDb } from "../db/client";
import { createStore } from "../db/store";

const tokens = parseServiceTokens(process.env.SERVICE_TOKENS);
if (tokens.length === 0) throw new Error("SERVICE_TOKENS must be configured");

const sql = await connectDb();
const app = createApp({ store: createStore(sql), tokens, rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 600) });
app.listen({ port: env.port(4000), hostname: "0.0.0.0", maxRequestBodySize: 4 * 1024 * 1024 });
console.log(`judge-api listening on :${env.port(4000)}`);

process.on("SIGTERM", async () => {
  await app.stop();
  await sql.end({ timeout: 5 });
  process.exit(0);
});
