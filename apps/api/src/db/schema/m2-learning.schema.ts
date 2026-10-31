import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { instructors, learners } from './m1-users.schema';

// 1. ENUMS
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published']);
export const materialTypeEnum = pgEnum('material_type', ['video', 'markdown', 'slide']);

// 2. CORE CURRICULUM TABLES (Course -> Chapter -> Lesson -> Material)
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructors.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: courseStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_courses_instructor_id').on(table.instructorId),
    index('idx_courses_status').on(table.status),
  ]
);

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_chapters_course_order').on(table.courseId, table.orderIndex),
    //index('idx_chapters_course_id').on(table.courseId),
  ]
);

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_lessons_chapter_order').on(table.chapterId, table.orderIndex),
    //index('idx_lessons_chapter_id').on(table.chapterId),
  ]
);

export const materials = pgTable(
  'materials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    type: materialTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    contentUrl: text('content_url'),
    textContent: text('text_content'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    isRagSource: boolean('is_rag_source').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_materials_lesson_id').on(table.lessonId),
    index('idx_materials_rag_source').on(table.isRagSource),
  ]
);

// 3. ENROLLMENTS TABLE
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    learnerId: uuid('learner_id')
      .notNull()
      .references(() => learners.id),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    lastAccessedLessonId: uuid('last_accessed_lesson_id').references(() => lessons.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_enrollments_learner_course').on(table.learnerId, table.courseId),
    index('idx_enrollments_learner_id').on(table.learnerId),
    index('idx_enrollments_course_id').on(table.courseId),
  ]
);

// 4. INTERACTIONS TABLES (Discussions & Notifications)
export const discussions = pgTable(
  'discussions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => discussions.id, {
      onDelete: 'cascade',
    }),
    textContent: text('text_content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_discussions_lesson_id').on(table.lessonId),
    index('idx_discussions_parent_id').on(table.parentId),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    textMsg: text('text_msg').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_id').on(table.userId),
  ]
);

// 5. RELATIONS
export const coursesRelations = relations(courses, ({ many }) => ({
  chapters: many(chapters),
  enrollments: many(enrollments),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, { fields: [chapters.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  chapter: one(chapters, { fields: [lessons.chapterId], references: [chapters.id] }),
  materials: many(materials),
  discussions: many(discussions),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  lesson: one(lessons, { fields: [materials.lessonId], references: [lessons.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
  lastAccessedLesson: one(lessons, {
    fields: [enrollments.lastAccessedLessonId],
    references: [lessons.id],
  }),
}));

export const discussionsRelations = relations(discussions, ({ one, many }) => ({
  lesson: one(lessons, { fields: [discussions.lessonId], references: [lessons.id] }),
  parent: one(discussions, {
    fields: [discussions.parentId],
    references: [discussions.id],
    relationName: 'discussion_replies',
  }),
  replies: many(discussions, { relationName: 'discussion_replies' }),
}));
