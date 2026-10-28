import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Schema M1 — chỉ các bảng do M1 sở hữu
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose output để dễ review migration trước khi apply
  verbose: true,
  strict: true,
});

