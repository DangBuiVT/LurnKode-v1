import { db } from '../../../db';
import { users, lessons, discussions, notifications, enrollments, courses } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Errors } from '../../../utils/errors';
import type { AuthUser } from '../../../middlewares/auth.middleware';

export const InteractionService = {
  // 1. GET /api/v1/lessons/:lessonId/discussions
  async listLessonDiscussions(lessonId: string, user: AuthUser) {
    // TODO:
    // 1. Kiểm tra lessonId tồn tại
    // 2. Lấy toàn bộ bình luận thuộc lessonId và gom nhóm theo cấu trúc cha - con (parentId === null là câu hỏi gốc, kèm mảng replies)
  },

  // 2. POST /api/v1/lessons/:lessonId/discussions (Constraint 9 & 10)
  async createDiscussion(
    lessonId: string,
    user: AuthUser,
    data: { textContent: string; parentId?: string }
  ) {
    // TODO:
    // 1. Constraint 10: Kiểm tra data.textContent.trim().length > 0. Nếu rỗng -> throw Errors.BadRequest('EMPTY_TEXT_CONTENT', ...)
    // 2. Kiểm tra lessonId tồn tại
    // 3. Constraint 9: Nếu có data.parentId:
    //    - Tìm bình luận cha (parentDiscussion). Nếu không có -> throw Errors.NotFound('Parent discussion')
    //    - Kiểm tra parentDiscussion.lessonId === lessonId. Nếu khác -> throw Errors.BadRequest('CROSS_LESSON_REPLY_FORBIDDEN', 'Parent discussion must belong to the same lesson.')
    // 4. Insert bình luận mới vào bảng discussions
    // 5. (Tùy chọn cộng điểm): Nếu là reply cho người khác (parentDiscussion.userId !== user.id), tạo 1 bản ghi trong bảng notifications báo cho người đó.
    // 6. Return bình luận vừa tạo (HTTP 201)
  },

  // 3. PATCH /api/v1/discussions/:id (Constraint 3)
  async updateDiscussion(discussionId: string, user: AuthUser, textContent: string) {
    // TODO:
    // 1. Constraint 10: Kiểm tra textContent.trim().length > 0
    // 2. Tìm discussion theo discussionId. Nếu không có -> 404
    // 3. Constraint 3: Chỉ tác giả (discussion.userId === user.id) mới được sửa nội dung -> nếu khác ném 403 Forbidden
    // 4. Cập nhật textContent và updatedAt = new Date()
  },

  // 4. DELETE /api/v1/discussions/:id (Constraint 3)
  async deleteDiscussion(discussionId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm discussion theo discussionId
    // 2. Constraint 3: Nếu user.role !== 'Admin' VÀ discussion.userId !== user.id -> ném 403 Forbidden
    // 3. Xóa discussion (các reply con tự động cascade)
  },

  // 5. GET /api/v1/notifications
  async getUserNotifications(userId: string) {
    // TODO: Lấy danh sách thông báo của userId sắp xếp theo createdAt giảm dần
  },

  // 6. PATCH /api/v1/notifications/:id/read
  async markNotificationRead(notificationId: string, userId: string) {
    // TODO:
    // 1. Tìm notification theo notificationId. Nếu không có -> 404
    // 2. Kiểm tra notification.userId === userId. Nếu khác -> 403 Forbidden
    // 3. Cập nhật isRead = true và return
  },
};