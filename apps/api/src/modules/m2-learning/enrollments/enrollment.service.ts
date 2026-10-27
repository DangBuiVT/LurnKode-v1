import { db } from '../../../db';
import { users, learners, courses, chapters, lessons, materials, enrollments } from '../../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Errors } from '../../../utils/errors';
import type { AuthUser } from '../../../middlewares/auth.middleware';

export const EnrollmentService = {
  async ensureLearnerExists(learnerId: string) {
    // TODO: Insert learnerId vào bảng users và learners với .onConflictDoNothing()
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
  },

  // 1. POST /api/v1/courses/:id/enroll
  async enrollCourse(courseId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm course theo courseId. Nếu không có hoặc status !== 'published' -> throw Errors.NotFound('Published course')
    // 2. Constraint 2: Nếu course.instructorId === user.id -> throw Errors.Forbidden('SELF_ENROLLMENT_FORBIDDEN', 'Instructors cannot enroll in their own course.')
    // 3. Kiểm tra xem learner đã enroll khóa này chưa. Nếu đã enroll -> throw Errors.Conflict('ALREADY_ENROLLED', 'Learner is already enrolled in this course.')
    // 4. Gọi await this.ensureLearnerExists(user.id)
    // 5. Insert vào bảng enrollments (lastAccessedLessonId = null) và return (HTTP 201)
  },

  // 2. GET /api/v1/my/enrollments
  async getMyEnrollments(learnerId: string) {
    // TODO:
    // Truy vấn danh sách enrollments của learnerId kèm thông tin course và lastAccessedLesson
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
  },
};