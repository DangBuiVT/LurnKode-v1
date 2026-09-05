---
name: progress-tracking
description: Hướng dẫn triển khai enrollment, learning progress tracking, và completion analytics cho DevVerse LMS.
---

# Progress Tracking Skill — DevVerse LMS

## 1. Progress Update Flow

```typescript
// POST /api/lessons/:id/progress
async function updateLessonProgress(
  userId: string,
  lessonId: string,
  watchProgress: number   // 0.0 to 1.0
): Promise<void> {
  const isCompleted = watchProgress >= 0.9  // 90% = completed

  await supabase.from('lesson_progress').upsert({
    user_id: userId,
    lesson_id: lessonId,
    is_completed: isCompleted,
    watch_progress: watchProgress,
    last_watched_at: new Date().toISOString()
  }, { onConflict: 'user_id,lesson_id' })

  // Check if course is now complete
  if (isCompleted) await checkCourseCompletion(userId, lessonId)
}

async function checkCourseCompletion(userId: string, lessonId: string): Promise<void> {
  // Get course_id from lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('modules(course_id)')
    .eq('id', lessonId)
    .single()

  const courseId = lesson?.modules?.[0]?.course_id
  if (!courseId) return

  const { data: progress } = await supabase
    .rpc('get_course_progress', { p_user_id: userId, p_course_id: courseId })

  if (progress?.percentage === 100) {
    await supabase.from('enrollments')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('course_id', courseId)
  }
}
```

## 2. Dashboard Analytics (Instructor)

```typescript
async function getCourseAnalytics(courseId: string, instructorId: string) {
  // Verify ownership
  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (course?.instructor_id !== instructorId) throw new ForbiddenError()

  const [enrollments, completions, avgProgress] = await Promise.all([
    supabase.from('enrollments').select('count', { count: 'exact' }).eq('course_id', courseId),
    supabase.from('enrollments').select('count', { count: 'exact' }).eq('course_id', courseId).not('completed_at', 'is', null),
    supabase.rpc('get_avg_course_progress', { p_course_id: courseId })
  ])

  return {
    total_enrolled: enrollments.count,
    completed: completions.count,
    completion_rate: completions.count / (enrollments.count || 1),
    avg_progress: avgProgress.data
  }
}
```

## Khi nào activate skill này

- Implement video progress tracking
- Build student dashboard / learning history
- Build instructor analytics dashboard
- Implement completion certificates
- Debug progress not saving
