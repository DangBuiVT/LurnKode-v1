CREATE TYPE "public"."course_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('video', 'markdown', 'slide');--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"text_content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"last_accessed_lesson_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"type" "material_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content_url" text,
	"text_content" text,
	"metadata" jsonb,
	"is_rag_source" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"text_msg" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_parent_id_discussions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_last_accessed_lesson_id_lessons_id_fk" FOREIGN KEY ("last_accessed_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chapters_course_order" ON "chapters" USING btree ("course_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_courses_instructor_id" ON "courses" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_courses_status" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_discussions_lesson_id" ON "discussions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_discussions_parent_id" ON "discussions" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_enrollments_learner_course" ON "enrollments" USING btree ("learner_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_learner_id" ON "enrollments" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course_id" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lessons_chapter_order" ON "lessons" USING btree ("chapter_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_materials_lesson_id" ON "materials" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_materials_rag_source" ON "materials" USING btree ("is_rag_source");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");