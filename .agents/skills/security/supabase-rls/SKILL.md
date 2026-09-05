---
name: supabase-rls
description: Hướng dẫn Row Level Security (RLS) patterns cho DevVerse LMS với Supabase. Bao gồm policy templates, role-based policies, và common security patterns.
---

# Supabase RLS Skill — DevVerse

## Nguyên tắc: RLS là tầng bảo vệ thứ 2

```
Request → Middleware Auth → RLS → Data
           (application)   (database)
```

**Ngay cả khi middleware bị bypass, RLS ngăn chặn data leakage.**

## 1. Bật RLS cho tất cả tables

```sql
-- Chạy cho TỪNG table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
```

## 2. Helper Functions

```sql
-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'student'
  );
$$;

-- Helper: is user enrolled in course?
CREATE OR REPLACE FUNCTION is_enrolled(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = auth.uid()
    AND course_id = p_course_id
  );
$$;
```

## 3. Policy Templates

### Courses

```sql
-- Public: xem published courses
CREATE POLICY "courses_public_view"
ON courses FOR SELECT
USING (is_published = TRUE);

-- Instructor: xem/edit own courses
CREATE POLICY "courses_instructor_manage"
ON courses FOR ALL
USING (
  instructor_id = auth.uid()
  AND current_user_role() IN ('instructor', 'admin')
);

-- Admin: full access
CREATE POLICY "courses_admin_full"
ON courses FOR ALL
USING (current_user_role() = 'admin');
```

### Submissions (code judge)

```sql
-- Student chỉ xem submissions của mình
CREATE POLICY "submissions_own"
ON submissions FOR SELECT
USING (user_id = auth.uid());

-- Student create submission
CREATE POLICY "submissions_create"
ON submissions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND current_user_role() = 'student'
);

-- Admin/Instructor xem submissions của course mình
CREATE POLICY "submissions_instructor_view"
ON submissions FOR SELECT
USING (
  current_user_role() IN ('instructor', 'admin')
  AND EXISTS (
    SELECT 1 FROM problems p
    JOIN courses c ON p.course_id = c.id
    WHERE p.id = submissions.problem_id
    AND (c.instructor_id = auth.uid() OR current_user_role() = 'admin')
  )
);
```

### Plagiarism Reports

```sql
-- Chỉ admin xem plagiarism reports
CREATE POLICY "plagiarism_admin_only"
ON plagiarism_reports FOR ALL
USING (current_user_role() = 'admin');
```

### RAG course chunks

```sql
-- Enrolled students có thể query course chunks
CREATE POLICY "chunks_enrolled_access"
ON course_chunks FOR SELECT
USING (
  is_enrolled(course_id)
  OR current_user_role() IN ('instructor', 'admin')
);
```

## 4. Test RLS policies

```sql
-- Trong Supabase SQL Editor, set JWT claims để test:
SELECT set_config(
  'request.jwt.claims',
  '{"sub": "test-user-id", "user_metadata": {"role": "student"}}',
  true
);

-- Thử query như student
SELECT * FROM submissions;  -- Chỉ thấy submissions của mình
SELECT * FROM plagiarism_reports;  -- Empty (blocked by RLS)
```

## Khi nào activate skill này

- Add RLS policy cho table mới
- Debug "permission denied" từ Supabase
- Security review data access patterns
- Setup RLS cho production
