# Feature Plan: M2 - Course & Material Management

## 1. Scope
- [ ] **Database:** Create Drizzle ORM schema for `courses`, `chapters`, `lessons`, `materials`, and `enrollments` utilizing UUIDs and snake_case naming conventions. Implement PostgreSQL Row Level Security (RLS) policies across all tables.
- [ ] **Backend:** Build REST API endpoints using Bun and ElysiaJS. Implement strict Elysia schema validation and standard `{ data, error }` response formats.
- [ ] **Frontend:** (Delegated to Frontend team) Consume APIs via TanStack Query without direct database access.
- [ ] **Testing:** Write Unit and Integration tests to ensure code coverage remains >= 80%.

**Estimated Complexity:** Medium

---

## 2. Business Requirements
- **Content Hierarchy:** The system strictly follows a 4-level structure: Course --> Chapter --> Lesson --> Material.
- **Sequential Learning:** Chapters and Lessons must include an `order_index`. Learners must complete a lesson before unlocking the next one.
- **Supported Materials:** Materials can be video, markdown/text, or slides.
- **AI RAG Integration:** Only text/markdown materials belonging to `Published` courses are flagged (`is_rag_source`) and embedded into `pgvector` for the AI Tutor.
- **Role-Based Access Control (RBAC):** Access is strictly segmented between `Learner`, `Instructor`, and `Admin` roles defined in the database. 

---

## 3. Database Schema & RLS

### 3.1. Drizzle ORM Schema Draft
```typescript
import { pgTable, uuid, text, timestamp, integer, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { users } from './users'; // Shared RBAC table

export const courseStatusEnum = pgEnum('course_status', ['draft', 'published']);
export const materialTypeEnum = pgEnum('material_type', ['video', 'markdown', 'slide']);

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  instructor_id: uuid('instructor_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  category: text('category'),
  status: courseStatusEnum('status').default('draft').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  course_id: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  chapter_id: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const materials = pgTable('materials', {
  id: uuid('id').defaultRandom().primaryKey(),
  lesson_id: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  type: materialTypeEnum('type').notNull(),
  title: text('title').notNull(),
  url: text('url'), 
  content: text('content'),
  is_rag_source: boolean('is_rag_source').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  learner_id: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  course_id: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  last_accessed_lesson_id: uuid('last_accessed_lesson_id').references(() => lessons.id, { onDelete: 'restrict' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 3.2. Row Level Security (RLS) Policies
- **Courses:** Instructors can `INSERT`/`UPDATE`/`DELETE` only where `auth.uid() = instructor_id`. Learners can `SELECT` only where `status = 'published'`.
- **Enrollments:** Learners can `SELECT` and `INSERT` only where `auth.uid() = learner_id`. Instructors cannot enroll in their own courses.
- **Materials:** RLS bypass is granted to the worker service for extracting `is_rag_source` materials into pgvector.

---

## 4. API Contracts
All endpoints use strict Elysia `t.Object()` validation and return data in the `{ data, error }` format.

| HTTP Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | Retrieve a list of published courses | Public / Learner |
| `POST` | `/api/courses` | Create a new course (defaults to Draft) | Instructor |
| `PUT` | `/api/courses/:id` | Update course details / Publish course | Instructor (Owner) |
| `GET` | `/api/courses/:id/lessons` | Retrieve sequential lessons | Learner (Enrolled) |
| `POST` | `/api/courses/:id/enroll` | Enroll a learner into a course | Learner |

---

## 5. Testing Strategy
- **Coverage Requirement:** Must pass the CI gate of >= 80% statement and branch coverage.
- **Critical Test Cases:**
  - `should return 403 Forbidden` if a Learner attempts to hit `POST /api/courses`
  - `should return 401 Unauthorized` if the request lacks a valid JWT.
  - `should enforce sequential learning` by returning an error if a Learner attempts to access Lesson 2 without completing Lesson 1.