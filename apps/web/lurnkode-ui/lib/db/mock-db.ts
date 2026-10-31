import {
  MOCK_USERS,
  MOCK_COURSES,
  MOCK_CHAPTERS,
  MOCK_LESSONS,
  MOCK_MATERIALS,
  MOCK_ENROLLMENTS,
  MOCK_QUIZZES,
  MOCK_QUIZ_ATTEMPTS,
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
  Quiz,
  QuizAttempt,
  QuizQuestionFeedback,
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
  private quizzes: Quiz[] = [...MOCK_QUIZZES];
  private quizAttempts: QuizAttempt[] = [...MOCK_QUIZ_ATTEMPTS];

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

  saveCourseWithCurriculum(payload: {
    courseId?: string;
    instructor_id: string;
    title: string;
    description?: string;
    status: "draft" | "published" | "archived";
    category?: string;
    chapters: Array<{
      id?: string;
      title: string;
      order_index: number;
      lessons: Array<{
        id?: string;
        title: string;
        order_index: number;
        materials: Array<{
          id?: string;
          title: string;
          type: "video" | "markdown" | "slide";
          content?: string | null;
          is_rag_source: boolean;
        }>;
      }>;
    }>;
  }): Course {
    let targetCourse: Course;

    if (payload.courseId) {
      const existing = this.getCourseById(payload.courseId);
      if (existing) {
        existing.title = payload.title;
        existing.description = payload.description || null;
        existing.status = payload.status;
        existing.category = payload.category || "General";
        targetCourse = existing;
      } else {
        targetCourse = {
          id: payload.courseId.startsWith("c-") ? payload.courseId : `c-${payload.courseId}`,
          instructor_id: payload.instructor_id,
          title: payload.title,
          description: payload.description || null,
          status: payload.status,
          category: payload.category || "General",
          created_at: new Date().toISOString(),
        };
        this.courses.unshift(targetCourse);
      }
    } else {
      targetCourse = {
        id: `c-${Date.now()}`,
        instructor_id: payload.instructor_id,
        title: payload.title,
        description: payload.description || null,
        status: payload.status,
        category: payload.category || "General",
        created_at: new Date().toISOString(),
      };
      this.courses.unshift(targetCourse);
    }

    // Clear existing chapters, lessons, and materials for this course to replace with updated structure
    const oldChapterIds = this.chapters
      .filter((ch) => ch.course_id === targetCourse.id || ch.course_id === targetCourse.id.replace("c-", ""))
      .map((ch) => ch.id);

    const oldLessonIds = this.lessons
      .filter((l) => oldChapterIds.includes(l.chapter_id))
      .map((l) => l.id);

    this.materials = this.materials.filter((m) => !oldLessonIds.includes(m.lesson_id));
    this.lessons = this.lessons.filter((l) => !oldChapterIds.includes(l.chapter_id));
    this.chapters = this.chapters.filter((ch) => !oldChapterIds.includes(ch.id));

    // Insert chapters, lessons, and materials
    payload.chapters.forEach((chData, chIdx) => {
      const chapterId = chData.id || `ch-${Date.now()}-${chIdx + 1}`;
      const newChapter: Chapter = {
        id: chapterId,
        course_id: targetCourse.id,
        title: chData.title || `Chương ${chIdx + 1}`,
        order_index: chData.order_index || chIdx + 1,
        created_at: new Date().toISOString(),
      };
      this.chapters.push(newChapter);

      chData.lessons.forEach((lesData, lesIdx) => {
        const lessonId = lesData.id || `les-${Date.now()}-${chIdx + 1}-${lesIdx + 1}`;
        const newLesson: Lesson = {
          id: lessonId,
          chapter_id: chapterId,
          title: lesData.title || `Bài học ${chIdx + 1}.${lesIdx + 1}`,
          order_index: lesData.order_index || lesIdx + 1,
          created_at: new Date().toISOString(),
        };
        this.lessons.push(newLesson);

        lesData.materials.forEach((matData, matIdx) => {
          const materialId = matData.id || `mat-${Date.now()}-${chIdx + 1}-${lesIdx + 1}-${matIdx + 1}`;
          const newMaterial: Material = {
            id: materialId,
            lesson_id: lessonId,
            type: matData.type || "markdown",
            title: matData.title || "Tài liệu học",
            content: matData.content || null,
            is_rag_source: Boolean(matData.is_rag_source),
            created_at: new Date().toISOString(),
          };
          this.materials.push(newMaterial);
        });
      });
    });

    return targetCourse;
  }

  deleteCourse(id: string): boolean {
    const cleanId = id.startsWith("c-") ? id : `c-${id}`;
    const rawId = id.replace("c-", "");
    const idx = this.courses.findIndex((c) => c.id === cleanId || c.id === rawId || c.id === id);
    if (idx > -1) {
      const removedCourse = this.courses[idx];
      this.courses.splice(idx, 1);

      // Cascade remove chapters, lessons, materials
      const chapterIds = this.chapters
        .filter((ch) => ch.course_id === removedCourse.id || ch.course_id === rawId)
        .map((ch) => ch.id);

      const lessonIds = this.lessons
        .filter((l) => chapterIds.includes(l.chapter_id))
        .map((l) => l.id);

      this.materials = this.materials.filter((m) => !lessonIds.includes(m.lesson_id));
      this.lessons = this.lessons.filter((l) => !chapterIds.includes(l.chapter_id));
      this.chapters = this.chapters.filter((ch) => !chapterIds.includes(ch.id));
      this.enrollments = this.enrollments.filter(
        (e) => e.course_id !== removedCourse.id && e.course_id !== rawId
      );
      this.quizzes = this.quizzes.filter(
        (q) => q.course_id !== removedCourse.id && q.course_id !== rawId
      );
      return true;
    }
    return false;
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

  unenrollCourse(learnerId: string, courseId: string): boolean {
    const cleanId = courseId.startsWith("c-") ? courseId : `c-${courseId}`;
    const rawId = courseId.replace("c-", "");
    const idx = this.enrollments.findIndex(
      (e) =>
        e.learner_id === learnerId &&
        (e.course_id === cleanId || e.course_id === rawId || e.course_id === courseId)
    );

    if (idx > -1) {
      this.enrollments.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ----------------------------------------------------------------
  // Quizzes & Automated Assessment Operations (Section 4.4 / Section 5.4)
  // ----------------------------------------------------------------
  getQuizzes(courseId?: string): Quiz[] {
    if (!courseId) return this.quizzes;
    const cleanId = courseId.replace("c-", "");
    return this.quizzes.filter(
      (q) =>
        q.course_id === courseId ||
        q.course_id === `c-${cleanId}` ||
        q.course_id === cleanId
    );
  }

  getQuizById(id: string): Quiz | undefined {
    return this.quizzes.find((q) => q.id === id);
  }

  getQuizByLessonId(courseId: string, lessonId: string): Quiz | undefined {
    const cleanCourseId = courseId.replace("c-", "");
    return this.quizzes.find(
      (q) =>
        (q.course_id === courseId ||
          q.course_id === `c-${cleanCourseId}` ||
          q.course_id === cleanCourseId) &&
        q.lesson_id === lessonId
    );
  }

  saveQuiz(data: Omit<Quiz, "id" | "created_at"> & { id?: string }): Quiz {
    if (data.id) {
      const index = this.quizzes.findIndex((q) => q.id === data.id);
      if (index > -1) {
        const updated: Quiz = {
          ...this.quizzes[index],
          ...data,
          id: data.id,
          updated_at: new Date().toISOString(),
        };
        this.quizzes[index] = updated;
        return updated;
      }
    }

    const newQuiz: Quiz = {
      ...data,
      id: data.id || `quiz-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.quizzes.push(newQuiz);
    return newQuiz;
  }

  deleteQuiz(quizId: string): boolean {
    const idx = this.quizzes.findIndex((q) => q.id === quizId);
    if (idx > -1) {
      this.quizzes.splice(idx, 1);
      this.quizAttempts = this.quizAttempts.filter((att) => att.quiz_id !== quizId);
      return true;
    }
    return false;
  }

  submitQuizAttempt(
    learnerId: string,
    quizId: string,
    answers: Record<string, string[]>,
    timeSpentSeconds: number = 0
  ): QuizAttempt {
    const quiz = this.getQuizById(quizId);
    if (!quiz) {
      throw new Error(`Quiz with id ${quizId} not found`);
    }

    const learner = this.getUserById(learnerId) || {
      id: learnerId,
      name: "Current Learner",
      email: "learner@lurnkode.edu",
      role: "learner" as const,
      created_at: new Date().toISOString(),
    };

    let totalScore = 0;
    let totalMaxScore = 0;
    const feedbacks: QuizQuestionFeedback[] = [];

    quiz.questions.forEach((q) => {
      totalMaxScore += q.points;
      const correctOptionIds = q.options.filter((o) => o.is_correct).map((o) => o.id);
      const userSelected = answers[q.id] || [];

      let isCorrect = false;
      if (q.type === "single_choice") {
        isCorrect =
          userSelected.length === 1 &&
          correctOptionIds.length === 1 &&
          userSelected[0] === correctOptionIds[0];
      } else {
        // multiple_choice
        isCorrect =
          userSelected.length === correctOptionIds.length &&
          userSelected.every((id) => correctOptionIds.includes(id));
      }

      const pointsEarned = isCorrect ? q.points : 0;
      totalScore += pointsEarned;

      feedbacks.push({
        question_id: q.id,
        is_correct: isCorrect,
        user_answers: userSelected,
        correct_answers: correctOptionIds,
        points_earned: pointsEarned,
        max_points: q.points,
        explanation: q.explanation,
      });
    });

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const passed = percentage >= quiz.passing_score_percentage;

    const newAttempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      quiz_id: quiz.id,
      learner_id: learner.id,
      learner_name: learner.name,
      learner_email: learner.email,
      answers,
      score: totalScore,
      max_score: totalMaxScore,
      percentage,
      passed,
      time_spent_seconds: timeSpentSeconds,
      submitted_at: new Date().toISOString(),
      feedback: feedbacks,
    };

    this.quizAttempts.unshift(newAttempt);

    // If passed and associated with a lesson, automatically mark lesson as completed
    if (passed && quiz.lesson_id) {
      const enrollment = this.getEnrollment(learnerId, quiz.course_id);
      if (enrollment) {
        if (!enrollment.completed_lesson_ids) {
          enrollment.completed_lesson_ids = [];
        }
        if (!enrollment.completed_lesson_ids.includes(quiz.lesson_id)) {
          enrollment.completed_lesson_ids.push(quiz.lesson_id);
          enrollment.last_accessed_at = new Date().toISOString();
        }
      }
    }

    return newAttempt;
  }

  getQuizAttempts(quizId: string, learnerId?: string): QuizAttempt[] {
    return this.quizAttempts.filter(
      (att) => att.quiz_id === quizId && (!learnerId || att.learner_id === learnerId)
    );
  }

  getLatestLearnerAttempt(quizId: string, learnerId: string = CURRENT_USER.id): QuizAttempt | undefined {
    const attempts = this.getQuizAttempts(quizId, learnerId);
    return attempts.length > 0 ? attempts[0] : undefined;
  }

  getQuizStatistics(quizId: string) {
    const attempts = this.getQuizAttempts(quizId);
    const uniqueLearners = new Set(attempts.map((a) => a.learner_id)).size;
    const passedCount = attempts.filter((a) => a.passed).length;
    const avgScore =
      attempts.length > 0
        ? Number((attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1))
        : 0;
    const passRate =
      attempts.length > 0 ? Math.round((passedCount / attempts.length) * 100) : 0;

    return {
      totalSubmissions: attempts.length,
      uniqueLearners,
      avgScore,
      passRate,
      attempts,
    };
  }
}

export const mockDb = new MockDatabase();
