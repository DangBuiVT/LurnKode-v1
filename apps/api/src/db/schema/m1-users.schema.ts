import { pgTable, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
});

export const instructors = pgTable('instructors', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const learners = pgTable('learners', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
});