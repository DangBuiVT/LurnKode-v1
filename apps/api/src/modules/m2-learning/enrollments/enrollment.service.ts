import { db } from '../../../db';
import { users, learners, courses, chapters, lessons, materials, enrollments } from '../../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Errors } from '../../../utils/errors';
import type { AuthUser } from '../../../middlewares/auth.middleware';
import { CourseService } from '../courses/course.service';

export const EnrollmentService = {
  async ensureLearnerExists(learnerId: string) {
    const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, learnerId));
    if (!user) throw Errors.NotFound('Learner user');
    if (user.role !== 'Learner') throw Errors.Forbidden('LEARNER_ROLE_REQUIRED', 'Only learners can enroll in courses.');
    await db.insert(learners).values({id: learnerId}).onConflictDoNothing();
  },

  /**
   * Helper quan trọng nhất của M2:
   * Lấy danh sách toàn bộ bài học của 1 khóa học được sắp xếp đúng thứ tự (Chapter.orderIndex ASC -> Lesson.orderIndex ASC)
   */
  async getOrderedCourseLessons(courseId: string) {
    // TODO:
    // 1. Join bảng lessons với bảng chapters theo chapters.courseId = courseId
    // 2. Sắp xếp theo asc(chapters.orderIndex), asc(lessons.orderIndex)
    // 3. Trả về mảng các bài học kèm số thứ tự toàn cục (1, 2, 3, ...)
    const rows = await db.select().from(lessons).innerJoin(chapters, eq(lessons.chapterId, chapters.id))
      .where(eq(chapters.courseId, courseId))
      .orderBy(asc(chapters.orderIndex), asc(lessons.orderIndex));
    return rows.map((row, i) => ({...row, rank: i+ 1}));
  },


  /**
   * Helper bổ sung cho 2 hàm cuối
   */
  async verifyLessonAccess(lessonId: string, user: AuthUser) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: {chapter: true},
    });
    if (!lesson) throw Errors.NotFound('Lesson');

    const courseId = lesson.chapter.courseId;
    const [enrollment] = await db.select().from(enrollments)
      .where(and(eq(enrollments.learnerId, user.id), eq(enrollments.courseId, courseId)));
    if (!enrollment) throw Errors.Forbidden('NOT_ENROLLED','Learner is not enrolled in this course.');

    const ordered = await this.getOrderedCourseLessons(courseId);
    const requestedRank = (ordered.find((p) => p.lessons.id === lessonId))?.rank ?? 0;
    const unlockedRank = (ordered.find((p) => p.lessons.id === enrollment.lastAccessedLessonId))?.rank ?? 0;
    if (requestedRank > unlockedRank + 1){
      throw Errors.Forbidden(         
        'SEQUENTIAL_PREREQUISITE_FAILED',
        `Access denied. You must complete prerequisite lesson #${unlockedRank + 1} before accessing this lesson.`,
        {requestedOrderIndex: requestedRank, unlockedOrderIndex: unlockedRank + 1}
      );
    }
    return {enrollment, requestedRank, unlockedRank};
  },
  // 1. POST /api/v1/courses/:id/enroll
  async enrollCourse(courseId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm course theo courseId. Nếu không có hoặc status !== 'published' -> throw Errors.NotFound('Published course')
    // 2. Constraint 2: Nếu course.instructorId === user.id -> throw Errors.Forbidden('SELF_ENROLLMENT_FORBIDDEN', 'Instructors cannot enroll in their own course.')
    // 3. Kiểm tra xem learner đã enroll khóa này chưa. Nếu đã enroll -> throw Errors.Conflict('ALREADY_ENROLLED', 'Learner is already enrolled in this course.')
    // 4. Gọi await this.ensureLearnerExists(user.id)
    // 5. Insert vào bảng enrollments (lastAccessedLessonId = null) và return (HTTP 201)
    const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.status, 'published')));
    if (!course) throw Errors.NotFound('Published course');
    if (course.instructorId === user.id) throw Errors.Forbidden('SELF_ENROLLMENT_FORBIDDEN', 'Instructors cannot enroll in their own course.');
    const existing = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.learnerId, user.id), eq(enrollments.courseId, courseId)),
    });
    if (existing) throw Errors.Conflict('ALREADY_ENROLLED', 'Learner is already enrolled in this course.');
    await this.ensureLearnerExists(user.id);

    try {
      const [enrollment] = await db.insert(enrollments)
      .values({learnerId: user.id, courseId: courseId, lastAccessedLessonId: null}).returning();
      return enrollment;
    } catch (err: any) {
      const code = err.code ?? err.cause?.code;
      if (code === '23505') {
        throw Errors.Conflict('ALREADY_ENROLLED', 'Learner is already enrolled in this course.');
      }
      throw err;
    }
  },

  // 2. GET /api/v1/my/enrollments
  async getMyEnrollments(learnerId: string) {
    const list = await db.query.enrollments.findMany({
      where: eq(enrollments.learnerId, learnerId),
      with: { course: true, lastAccessedLesson: true },
    });

    const enriched = await Promise.all(
      list.map(async (item) => {
        const ordered = await this.getOrderedCourseLessons(item.courseId);
        const totalLessons = ordered.length;
        const unlockedRank = item.lastAccessedLessonId
          ? ordered.find((p) => p.lessons.id === item.lastAccessedLessonId)?.rank ?? 0
          : 0;
        const progress = totalLessons > 0 ? Math.round((unlockedRank / totalLessons) * 100) : 0;
        const isCompleted = totalLessons > 0 && unlockedRank >= totalLessons;
        return {
          ...item,
          totalLessons,
          completedLessons: unlockedRank,
          progress,
          status: isCompleted ? ('completed' as const) : ('in_progress' as const),
        };
      })
    );

    return enriched;
  },

  // 3. GET /api/v1/lessons/:id/access (Constraint 4: Sequential Access Verification)
  async accessLessonMaterials(lessonId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm bài học lessonId kèm chapter để biết nó thuộc courseId nào. Nếu không thấy -> 404
    // 2. Tìm bản ghi enrollment của user.id tại courseId đó. Nếu chưa enroll -> throw Errors.Forbidden('NOT_ENROLLED', ...)
    // 3. Lấy danh sách thứ tự bài học từ await this.getOrderedCourseLessons(courseId)
    // 4. Xác định vị trí (rank/orderIndex) của bài học đang yêu cầu (requestedRank) và vị trí của bài học tại enrollment.lastAccessedLessonId (unlockedRank, nếu null thì bằng 0)
    // 5. Constraint 4: Nếu requestedRank > unlockedRank + 1:
    //    -> throw Errors.Forbidden(
    //         'SEQUENTIAL_PREREQUISITE_FAILED',
    //         `Access denied. You must complete prerequisite lesson #${unlockedRank + 1} before accessing this lesson.`,
    //         { requestedOrderIndex: requestedRank, unlockedOrderIndex: unlockedRank + 1 }
    //       )
    // 6. Nếu hợp lệ: Truy vấn toàn bộ materials của lessonId và trả về

    //Bổ sung admin (full pass) và instructor (owned only)
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: {chapter: true},
    });
    if (!lesson) throw Errors.NotFound('Lesson');

    if (user.role === 'Admin' || user.role === 'Instructor') {
      await CourseService.verifyCourseOwnership(lesson.chapter.courseId, user);
    } else {
      await this.verifyLessonAccess(lessonId, user); //Hoàn thành 1 - 5
    }
    return await db.select().from(materials).where(eq(materials.lessonId, lessonId));
  },

  // 4. POST /api/v1/lessons/:id/complete (Constraint 5: Monotonic Progress Update)
  async completeLesson(lessonId: string, user: AuthUser) {
    // TODO:
    // 1. Tương tự hàm accessLessonMaterials: Kiểm tra bài học tồn tại, kiểm tra đã enroll, và kiểm tra Constraint 4 (không thể complete một bài chưa được mở khóa!)
    // 2. Constraint 5 (Monotonic Progress):
    //    So sánh thứ tự của bài vừa hoàn thành (completedRank) với bài ở lastAccessedLessonId (currentRank):
    //    - Chỉ cập nhật enrollment.lastAccessedLessonId = lessonId NẾU completedRank > currentRank.
    //    - Nếu completedRank <= currentRank (học viên ôn lại bài cũ): giữ nguyên lastAccessedLessonId.
    // 3. Return bản ghi enrollment sau khi cập nhật
    const {enrollment, requestedRank, unlockedRank} = await this.verifyLessonAccess(lessonId, user);
    if (requestedRank > unlockedRank) {
      const [updated] = await db
        .update(enrollments)
        .set({ lastAccessedLessonId: lessonId })
        .where(eq(enrollments.id, enrollment.id))
        .returning();
      return updated;
    }
    return enrollment;
  },

  // 5. DELETE /api/v1/courses/:id/enroll
  async leaveCourse(courseId: string, user: AuthUser) {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.learnerId, user.id), eq(enrollments.courseId, courseId)));
    if (!enrollment) throw Errors.Forbidden('NOT_ENROLLED','Learner is not enrolled in this course.');
    await db.delete(enrollments).where(eq(enrollments.id, enrollment.id));
  },
};
