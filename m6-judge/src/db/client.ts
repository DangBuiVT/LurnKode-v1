import postgres from "postgres";
import { env } from "../config";
import { migrate } from "./migrate";

export async function connectDb() {
  const sql = postgres(env.databaseUrl(), { max: 10, onnotice: () => {} });
  // Postgres may still be starting when containers come up together.
  for (let i = 0; ; i++) {
    try {
      await migrate(sql);
      return sql;
    } catch (e) {
      if (i >= 30) throw e;
      await Bun.sleep(1000);
    }
  }
}
