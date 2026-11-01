import { pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/** M2-owned role membership rows referencing M1's canonical user records. */
export const instructors = pgTable("instructors", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
});

export const learners = pgTable("learners", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
});
