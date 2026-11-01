import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config";
import { connectDb } from "../db/client";
import { createStore } from "../db/store";
import { QUEUE_NAME } from "../queue";
import { dispatchCallbacks, dispatchEnqueue, reconcile } from "./dispatch";

const sql = await connectDb();
const store = createStore(sql);
const redis = new IORedis(env.redisUrl(), { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection: redis });

let stopping = false;
process.on("SIGTERM", () => (stopping = true));
let lastReconcile = 0;

console.log("judge-dispatcher started");
while (!stopping) {
  try {
    await dispatchEnqueue({ store, queue });
    await dispatchCallbacks({ store, callbackUrl: env.callbackUrl(), callbackToken: env.callbackToken(), fetch });
    if (Date.now() - lastReconcile > 30_000) {
      lastReconcile = Date.now();
      const n = await reconcile(store);
      if (n > 0) console.log(JSON.stringify({ level: "warn", msg: "reconciled stuck submissions", count: n }));
    }
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "dispatcher loop failed", err: (e as Error).message }));
  }
  await Bun.sleep(500);
}
await queue.close();
redis.disconnect();
await sql.end({ timeout: 5 });
