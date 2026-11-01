import { Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config";
import { connectDb } from "../db/client";
import { createStore } from "../db/store";
import { executeSubmission } from "../judge/execute";
import { QUEUE_NAME } from "../queue";
import { processJob } from "./process";

const sql = await connectDb();
const store = createStore(sql);
const connection = new IORedis(env.redisUrl(), { maxRetriesPerRequest: null });

const worker = new Worker(
  QUEUE_NAME,
  (job) => processJob({ store, execute: executeSubmission }, job as never),
  { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2) },
);
worker.on("failed", (job, err) =>
  console.warn(JSON.stringify({ level: "warn", msg: "job attempt failed", jobId: job?.id, err: err.message })),
);
worker.on("error", (err) => console.error(JSON.stringify({ level: "error", msg: "worker error", err: err.message })));
console.log("judge-worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  connection.disconnect();
  await sql.end({ timeout: 5 });
  process.exit(0);
});
