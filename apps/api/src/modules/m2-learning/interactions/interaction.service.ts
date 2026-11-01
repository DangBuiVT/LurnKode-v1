import { db } from '../../../db';
import { users, lessons, discussions, notifications, enrollments, courses } from '../../../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { Errors } from '../../../utils/errors';
import type { AuthUser } from '../../../middlewares/auth.middleware';

export const InteractionService = {
  //Helper
  async verifyDiscussionAccess(lessonId: string, user: AuthUser) {
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: { chapter: true },
    });
    if (!lesson) throw Errors.NotFound('Lesson');
    const courseId = lesson.chapter.courseId;

    if (user.role === 'Admin') return lesson;

    if (user.role === 'Instructor') {
      const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
      if (!course || course.instructorId !== user.id) {
        throw Errors.Forbidden('NOT_COURSE_OWNER', 'You do not own this course.');
      }
      return lesson;
    }

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.learnerId, user.id), eq(enrollments.courseId, courseId)));
    if (!enrollment) throw Errors.Forbidden('NOT_ENROLLED', 'Learner is not enrolled in this course.');
    return lesson;
  },

  // 1. GET /api/v1/lessons/:id/discussions
  async listLessonDiscussions(lessonId: string, user: AuthUser) {
    // TODO:
    // 1. Kiểm tra lessonId tồn tại
    // 2. Lấy toàn bộ bình luận thuộc lessonId và gom nhóm theo cấu trúc cha - con (parentId === null là câu hỏi gốc, kèm mảng replies)
    await this.verifyDiscussionAccess(lessonId, user);

    const all = await db
      .select()
      .from(discussions)
      .where(eq(discussions.lessonId, lessonId))
      .orderBy(asc(discussions.createdAt));

    const roots = all.filter((d) => d.parentId === null);
    return roots.map((root) => ({...root, replies: all.filter((d) => d.parentId === root.id),}));
  },

  // 2. POST /api/v1/lessons/:id/discussions (Constraint 9 & 10)
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
    if (data.textContent.trim().length === 0) {
      throw Errors.BadRequest('EMPTY_TEXT_CONTENT', 'Text content must contain at least one non-whitespace character.');
    }

    await this.verifyDiscussionAccess(lessonId, user);

    let parentAuthorId: string | null = null;
    if (data.parentId) {
      const [parent] = await db.select().from(discussions).where(eq(discussions.id, data.parentId));
      if (!parent) throw Errors.NotFound('Parent discussion');
      if (parent.lessonId !== lessonId) {
        throw Errors.BadRequest('CROSS_LESSON_REPLY_FORBIDDEN', 'Parent discussion must belong to the same lesson.');
      }
      parentAuthorId = parent.userId;
    }

    const [account] = await db.select({ id: users.id }).from(users).where(eq(users.id, user.id));
    if (!account) throw Errors.Unauthorized();

    const [discussion] = await db.insert(discussions)
      .values({
        lessonId,
        userId: user.id,
        parentId: data.parentId,
        textContent: data.textContent,
      }).returning();

    // Tùy chọn: báo cho tác giả bình luận cha
    if (parentAuthorId && parentAuthorId !== user.id) {
      await db.insert(notifications).values({
        userId: parentAuthorId,
        title: 'New reply',
        textMsg: 'Someone replied to your discussion.',
      });
    }

    return discussion;
  },

  // 3. PATCH /api/v1/discussions/:id (Constraint 3)
  async updateDiscussion(discussionId: string, user: AuthUser, textContent: string) {
    // TODO:
    // 1. Constraint 10: Kiểm tra textContent.trim().length > 0
    // 2. Tìm discussion theo discussionId. Nếu không có -> 404
    // 3. Constraint 3: Chỉ tác giả (discussion.userId === user.id) mới được sửa nội dung -> nếu khác ném 403 Forbidden
    // 4. Cập nhật textContent và updatedAt = new Date()
    if (textContent.trim().length === 0) {
      throw Errors.BadRequest('EMPTY_TEXT_CONTENT', 'Text content must contain at least one non-whitespace character.');
    }

    const [discussion] = await db.select().from(discussions).where(eq(discussions.id, discussionId));
    if (!discussion) throw Errors.NotFound('Discussion');
    if (discussion.userId !== user.id) {
      throw Errors.Forbidden('NOT_AUTHOR', 'Only the author can edit this discussion.');
    }

    const [updated] = await db
      .update(discussions)
      .set({ textContent, updatedAt: new Date() })
      .where(eq(discussions.id, discussionId))
      .returning();
    return updated;
  },

  // 4. DELETE /api/v1/discussions/:id (Constraint 3)
  async deleteDiscussion(discussionId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm discussion theo discussionId
    // 2. Constraint 3: Nếu user.role !== 'Admin' VÀ discussion.userId !== user.id -> ném 403 Forbidden
    // 3. Xóa discussion (các reply con tự động cascade)
    const [discussion] = await db.select().from(discussions).where(eq(discussions.id, discussionId));
    if (!discussion) throw Errors.NotFound('Discussion');
    if (user.role !== 'Admin' && discussion.userId !== user.id) throw Errors.Forbidden('NOT_AUTHOR', 'Only the author can delete this discussion.');
    await db.delete(discussions).where(eq(discussions.id, discussionId));
  },

  // 5. GET /api/v1/notifications
  async getUserNotifications(userId: string) {
    // TODO: Lấy danh sách thông báo của userId sắp xếp theo createdAt giảm dần
    return db.select().from(notifications).where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  },

  // 6. PATCH /api/v1/notifications/:id/read
  async markNotificationRead(notificationId: string, userId: string) {
    // TODO:
    // 1. Tìm notification theo notificationId. Nếu không có -> 404
    // 2. Kiểm tra notification.userId === userId. Nếu khác -> 403 Forbidden
    // 3. Cập nhật isRead = true và return
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
    if (!notif) throw Errors.NotFound('Notification');
    if (notif.userId !== userId) throw Errors.Forbidden('NOT_FROM_USER', 'The notification is not from user.');
    const [update] = await db.update(notifications).set({isRead: true}).where(eq(notifications.id, notificationId)).returning();
    return update;
  },
};
