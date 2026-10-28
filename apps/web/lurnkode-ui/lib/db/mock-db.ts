import {
  MOCK_USERS,
  MOCK_COURSES,
  MOCK_CHAPTERS,
  MOCK_LESSONS,
  MOCK_MATERIALS,
  MOCK_ENROLLMENTS,
  CURRENT_USER,
} from "./mock-data";
import {
  User,
  Course,
  Chapter,
  Lesson,
  Material,
  Enrollment,
  CourseWithHierarchy,
  ChapterWithLessons,
  LessonWithMaterials,
} from "./schema";

/**
 * Temporary In-Memory Database Service
 * Emulates PostgreSQL + Drizzle ORM operations for M2 Course & Material Management
 */
class MockDatabase {
  private users: User[] = [...MOCK_USERS];
  private courses: Course[] = [...MOCK_COURSES];
  private chapters: Chapter[] = [...MOCK_CHAPTERS];
  private lessons: Lesson[] = [...MOCK_LESSONS];
  private materials: Material[] = [...MOCK_MATERIALS];
  private enrollments: Enrollment[] = [...MOCK_ENROLLMENTS];

  // ----------------------------------------------------------------
  // Current Session & Users
  // ----------------------------------------------------------------
  getCurrentUser(): User {
    return CURRENT_USER;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  // ----------------------------------------------------------------
  // Courses Operations
  // ----------------------------------------------------------------
  getCourses(filter?: { status?: "draft" | "published" | "archived"; instructor_id?: string }): Course[] {
    return this.courses.filter((course) => {
      if (filter?.status && course.status !== filter.status) return false;
      if (filter?.instructor_id && course.instructor_id !== filter.instructor_id) return false;
      return true;
    });
  }

  getCourseById(id: string): Course | undefined {
    return this.courses.find(
      (c) => c.id === id || c.id === `c-${id}` || c.id === `course-${id}`
    );
  }

  createCourse(data: {
    instructor_id: string;
    title: string;
    description?: string;
    status?: "draft" | "published" | "archived";
    category?: string;
  }): Course {
    const newCourse: Course = {
      id: `c-${Date.now()}`,
      instructor_id: data.instructor_id,
      title: data.title,
      description: data.description || null,
      status: data.status || "draft",
      category: data.category || "General",
      created_at: new Date().toISOString(),
    };
    this.courses.unshift(newCourse);
    return newCourse;
  }

  // ----------------------------------------------------------------
  // 4-Tier Hierarchy & Sequential Learning Engine
  // ----------------------------------------------------------------
  getCourseHierarchy(
    courseId: string,
    learnerId: string = CURRENT_USER.id
  ): CourseWithHierarchy | undefined {
    const course = this.getCourseById(courseId);
    if (!course) return undefined;

    const instructor =
      this.getUserById(course.instructor_id) || {
        id: course.instructor_id,
        name: "Instructor",
        email: "instructor@lurnkode.edu",
        role: "instructor" as const,
        created_at: course.created_at,
      };

    const enrollment = this.enrollments.find(
      (e) => (e.course_id === course.id || e.course_id === `c-${course.id}`) && e.learner_id === learnerId
    );

    const completedLessonIds = new Set<string>(enrollment?.completed_lesson_ids || []);
    const lastAccessedId = enrollment?.last_accessed_lesson_id;

    // Retrieve and sort chapters by order_index
    const rawChapters = this.chapters
      .filter((ch) => ch.course_id === course.id)
      .sort((a, b) => a.order_index - b.order_index);

    let totalLessonsCount = 0;
    let completedLessonsCount = 0;
    let hasFoundActive = false;

    const chaptersWithLessons: ChapterWithLessons[] = rawChapters.map(
      (chapter, chapterIdx) => {
        // Retrieve and sort lessons by order_index
        const rawLessons = this.lessons
          .filter((l) => l.chapter_id === chapter.id)
          .sort((a, b) => a.order_index - b.order_index);

        totalLessonsCount += rawLessons.length;

        const lessonsWithMaterials: LessonWithMaterials[] = rawLessons.map(
          (lesson) => {
            const lessonMaterials = this.materials.filter(
              (m) => m.lesson_id === lesson.id
            );

            const isCompleted = completedLessonIds.has(lesson.id);
            if (isCompleted) completedLessonsCount++;

            // Sequential Learning Rule:
            // 1. If completed, unlocked.
            // 2. If it's the last accessed lesson or the immediate next after completed, it's active & unlocked.
            // 3. Otherwise locked.
            let isActive = false;
            let isLocked = true;

            if (isCompleted) {
              isLocked = false;
            } else if (!hasFoundActive) {
              // First incomplete lesson is active and unlocked
              isActive = true;
              isLocked = false;
              hasFoundActive = true;
            } else if (lastAccessedId && lesson.id === lastAccessedId) {
              isActive = true;
              isLocked = false;
            }

            return {
              ...lesson,
              materials: lessonMaterials,
              is_completed: isCompleted,
              is_active: isActive,
              is_locked: isLocked,
            };
          }
        );

        // A chapter is locked if all its lessons are locked
        const isChapterLocked =
          chapterIdx > 0 &&
          lessonsWithMaterials.every((l) => l.is_locked);

        return {
          ...chapter,
          lessons: lessonsWithMaterials,
          is_locked: isChapterLocked,
        };
      }
    );

    const overallProgress =
      totalLessonsCount > 0
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
        : 0;

    return {
      ...course,
      instructor,
      chapters: chaptersWithLessons,
      enrollment: enrollment || null,
      overall_progress: overallProgress,
    };
  }

  // ----------------------------------------------------------------
  // RAG Content Extraction for M4 AI Tutor
  // ----------------------------------------------------------------
  getRagSources(courseId: string): Material[] {
    const course = this.getCourseById(courseId);
    if (!course || course.status !== "published") return [];

    const chapterIds = this.chapters
      .filter((ch) => ch.course_id === course.id)
      .map((ch) => ch.id);

    const lessonIds = this.lessons
      .filter((l) => chapterIds.includes(l.chapter_id))
      .map((l) => l.id);

    return this.materials.filter(
      (m) => lessonIds.includes(m.lesson_id) && m.is_rag_source === true
    );
  }

  // ----------------------------------------------------------------
  // Enrollments
  // ----------------------------------------------------------------
  getEnrollment(learnerId: string, courseId: string): Enrollment | undefined {
    const cleanId = courseId.startsWith("c-") ? courseId : `c-${courseId}`;
    return this.enrollments.find(
      (e) => e.learner_id === learnerId && (e.course_id === cleanId || e.course_id === courseId)
    );
  }

  toggleLessonCompleted(learnerId: string, courseId: string, lessonId: string): boolean {
    const cleanId = courseId.startsWith("c-") ? courseId : `c-${courseId}`;
    let enrollment = this.getEnrollment(learnerId, cleanId);
    if (!enrollment) {
      enrollment = this.enrollCourse(learnerId, cleanId);
    }

    if (!enrollment.completed_lesson_ids) {
      enrollment.completed_lesson_ids = [];
    }

    const index = enrollment.completed_lesson_ids.indexOf(lessonId);
    if (index > -1) {
      enrollment.completed_lesson_ids.splice(index, 1);
      return false;
    } else {
      enrollment.completed_lesson_ids.push(lessonId);
      enrollment.last_accessed_lesson_id = lessonId;
      enrollment.last_accessed_at = new Date().toISOString();
      return true;
    }
  }

  isLessonCompleted(learnerId: string, courseId: string, lessonId: string): boolean {
    const enrollment = this.getEnrollment(learnerId, courseId);
    return Boolean(enrollment?.completed_lesson_ids?.includes(lessonId));
  }

  touchLessonAccess(learnerId: string, courseId: string, lessonId: string): void {
    const cleanId = courseId.startsWith("c-") ? courseId : `c-${courseId}`;
    let enrollment = this.getEnrollment(learnerId, cleanId);
    if (!enrollment) {
      enrollment = this.enrollCourse(learnerId, cleanId);
    }

    enrollment.last_accessed_lesson_id = lessonId;
    enrollment.last_accessed_at = new Date().toISOString();
  }

  getLastAccessedLesson(learnerId: string = CURRENT_USER.id): { courseId: string; lessonId: string } | undefined {
    const userEnrollments = this.enrollments.filter((e) => e.learner_id === learnerId);
    if (userEnrollments.length === 0) return undefined;

    // Sort enrollments by last_accessed_at (descending), fallback to created_at
    const sorted = [...userEnrollments].sort((a, b) => {
      const timeA = new Date(a.last_accessed_at || a.created_at).getTime();
      const timeB = new Date(b.last_accessed_at || b.created_at).getTime();
      return timeB - timeA;
    });

    for (const enrollment of sorted) {
      const course = this.getCourseById(enrollment.course_id);
      if (!course) continue;

      const courseCleanId = course.id.replace("c-", "");

      // If last_accessed_lesson_id is recorded, return it
      if (enrollment.last_accessed_lesson_id) {
        return {
          courseId: courseCleanId,
          lessonId: enrollment.last_accessed_lesson_id,
        };
      }

      // Otherwise, find the first unlocked/active lesson in course
      const hierarchy = this.getCourseHierarchy(course.id, learnerId);
      if (hierarchy && hierarchy.chapters.length > 0) {
        for (const chapter of hierarchy.chapters) {
          const activeOrFirst = chapter.lessons.find((l) => l.is_active || !l.is_locked);
          if (activeOrFirst) {
            return {
              courseId: courseCleanId,
              lessonId: activeOrFirst.id,
            };
          }
        }
      }
    }

    return undefined;
  }

  getLearnerActiveEnrollments(learnerId: string = CURRENT_USER.id) {
    return this.enrollments
      .filter((e) => e.learner_id === learnerId)
      .map((enrollment) => {
        const course = this.getCourseById(enrollment.course_id);
        const hierarchy = course ? this.getCourseHierarchy(course.id, learnerId) : undefined;
        return {
          enrollment,
          course,
          hierarchy,
          courseId: course ? course.id.replace("c-", "") : "",
          lastLessonId: enrollment.last_accessed_lesson_id || "1.1",
        };
      })
      .filter((item) => item.course !== undefined);
  }

  enrollCourse(learnerId: string, courseId: string): Enrollment {
    const existing = this.getEnrollment(learnerId, courseId);
    if (existing) return existing;

    const firstChapter = this.chapters
      .filter((ch) => ch.course_id === courseId)
      .sort((a, b) => a.order_index - b.order_index)[0];

    const firstLesson = firstChapter
      ? this.lessons
          .filter((l) => l.chapter_id === firstChapter.id)
          .sort((a, b) => a.order_index - b.order_index)[0]
      : undefined;

    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      learner_id: learnerId,
      course_id: courseId,
      last_accessed_lesson_id: firstLesson?.id || null,
      last_accessed_at: new Date().toISOString(),
      completed_lesson_ids: [],
      created_at: new Date().toISOString(),
    };

    this.enrollments.push(newEnrollment);
    return newEnrollment;
  }
}

export const mockDb = new MockDatabase();
