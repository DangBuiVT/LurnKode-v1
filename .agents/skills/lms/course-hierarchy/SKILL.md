---
name: course-hierarchy
description: Hướng dẫn data model và API cho Course hierarchy trong DevVerse LMS. Bao gồm Course/Module/Lesson/Video/Slide structure, Supabase schema, enrollment system, và content delivery patterns.
---

# Course Hierarchy Skill — DevVerse LMS

## Cấu trúc nội dung

```
Course
├── Module 1
│   ├── Lesson 1.1 (Video + Slides)
│   ├── Lesson 1.2 (Video only)
│   └── Quiz 1
├── Module 2
│   ├── Lesson 2.1
│   └── Assignment 1
└── Final Exam
```

## 1. Database Schema

```sql
-- Courses
CREATE TABLE courses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  instructor_id   UUID REFERENCES auth.users(id),
  is_published    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Modules (ordered sections within a course)
CREATE TABLE modules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons
CREATE TABLE lessons (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id       UUID REFERENCES modules(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content_type    TEXT CHECK (content_type IN ('video', 'slide', 'mixed', 'text')),
  video_url       TEXT,   -- Supabase Storage signed URL
  slide_url       TEXT,   -- PDF in Supabase Storage
  duration_mins   INTEGER,
  order_index     INTEGER NOT NULL,
  is_free_preview BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Progress tracking per lesson
CREATE TABLE lesson_progress (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed    BOOLEAN DEFAULT FALSE,
  watch_progress  FLOAT DEFAULT 0,    -- 0.0 to 1.0
  last_watched_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);
```

## 2. API Endpoints Pattern

```typescript
// GET /courses — list published courses
// GET /courses/:id — course detail (with modules, lessons summary)
// POST /courses — create (instructor only)
// PUT /courses/:id — update (instructor owner only)

// POST /courses/:id/enroll — enroll student
// GET /courses/:id/progress — student's progress

// GET /lessons/:id — lesson content (enrolled only)
// POST /lessons/:id/progress — update watch progress
```

## 3. Enrollment & Access Control

```typescript
async function canAccessLesson(userId: string, lessonId: string): Promise<boolean> {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('is_free_preview, modules(course_id)')
    .eq('id', lessonId)
    .single()

  // Free preview - always accessible
  if (lesson?.is_free_preview) return true

  // Check enrollment
  const courseId = lesson?.modules?.[0]?.course_id
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  return !!enrollment
}
```

## 4. Progress Calculation

```typescript
async function getCourseProgress(userId: string, courseId: string): Promise<{
  completedLessons: number
  totalLessons: number
  percentage: number
}> {
  const { data } = await supabase.rpc('get_course_progress', {
    p_user_id: userId,
    p_course_id: courseId
  })
  return data
}
```

```sql
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS TABLE(completed_lessons BIGINT, total_lessons BIGINT, percentage FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(CASE WHEN lp.is_completed THEN 1 END) as completed_lessons,
    COUNT(l.id) as total_lessons,
    ROUND(COUNT(CASE WHEN lp.is_completed THEN 1 END)::FLOAT / NULLIF(COUNT(l.id), 0) * 100, 2) as percentage
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_user_id
  WHERE m.course_id = p_course_id;
$$;
```

## Khi nào activate skill này

- Design hoặc modify course/module/lesson schema
- Implement enrollment flow
- Build progress tracking
- Build content delivery (video, slides)
- Debug access control issues
