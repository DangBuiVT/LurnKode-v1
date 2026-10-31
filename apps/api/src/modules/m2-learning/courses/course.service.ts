import { db } from '../../../db';
import {
  users,
  instructors,
  courses,
  chapters,
  lessons,
  materials,
} from '../../../db/schema';
import { eq, and, ilike, sql, asc, count } from 'drizzle-orm';
import { Errors } from '../../../utils/errors';
import type { AuthUser } from '../../../middlewares/auth.middleware';

export const CourseService = {
  /**
   * Helper nội bộ: Đảm bảo user_id từ JWT đã tồn tại trong bảng users/instructors (tránh lỗi FK khi test độc lập)
   */
  async ensureInstructorExists(instructorId: string) {
    const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, instructorId));
    if (!user) throw Errors.NotFound('Instructor user');
    if (user.role !== 'Instructor' && user.role !== 'Admin') {
      throw Errors.Forbidden('INSTRUCTOR_ROLE_REQUIRED', 'Only instructors and administrators can manage courses.');
    }
    await db.insert(instructors).values({id: instructorId}).onConflictDoNothing();
  },

  /**
   * Helper nội bộ (Constraint 1): Kiểm tra quyền sở hữu khóa học
   */
  async verifyCourseOwnership(courseId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm course theo courseId. Nếu không có -> throw Errors.NotFound('Course')
    // 2. Constraint 1: Nếu user.role !== 'Admin' VÀ course.instructorId !== user.id
    //    -> throw Errors.Forbidden('NOT_COURSE_OWNER', 'You do not own this course.')
    // 3. Return bản ghi course
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) throw Errors.NotFound('Course');
    if (user.role !== 'Admin' && course.instructorId !== user.id){
      throw Errors.Forbidden('NOT_COURSE_OWNER', 'You do not own this course.');
    }
    return course;
  },

  /**
   * Helper nội bộ (Constraint 7 & 8): Kiểm tra tính hợp lệ của Material
   */
  validateMaterialDomain(input: {
    type: 'video' | 'markdown' | 'slide';
    contentUrl?: string | null;
    textContent?: string | null;
    isRagSource?: boolean;
  }) {
    // TODO:
    // 1. Constraint 7: Nếu input.isRagSource === true mà input.type !== 'markdown'
    //    -> throw Errors.BadRequest('INVALID_RAG_SOURCE_TYPE', 'Only markdown materials can be flagged as RAG source.')
    // 2. Constraint 8:
    //    - Nếu input.type === 'markdown' và (!input.textContent || input.textContent.trim().length === 0)
    //      -> throw Errors.BadRequest('MISSING_MARKDOWN_CONTENT', 'Markdown material requires non-empty text_content.')
    //    - Nếu (input.type === 'video' || input.type === 'slide') và (!input.contentUrl || input.contentUrl.trim().length === 0)
    //      -> throw Errors.BadRequest('MISSING_CONTENT_URL', 'Video or slide material requires a valid content_url.')
    if (input.isRagSource === true && input.type !== 'markdown'){
      throw Errors.BadRequest('INVALID_RAG_SOURCE_TYPE', 'Only markdown materials can be flagged as RAG source.');
    }
    if (input.type === 'markdown' && (!input.textContent || input.textContent.trim().length === 0)){
      throw Errors.BadRequest('MISSING_MARKDOWN_CONTENT', 'Markdown material requires non-empty text_content.');
    }
    if ((input.type === 'video' || input.type === 'slide') && (!input.contentUrl || input.contentUrl.trim().length === 0)){
      throw Errors.BadRequest('MISSING_CONTENT_URL', 'Video or slide material requires a valid content_url.');
    }
  },

  // ==========================================
  // COURSES CRUD
  // ==========================================
  async createCourse(user: AuthUser, data: { title: string; description?: string }) {
    // TODO:
    // 1. Gọi await this.ensureInstructorExists(user.id)
    // 2. Insert vào bảng courses với instructorId = user.id, status = 'draft'
    // 3. Return bản ghi vừa tạo (.returning())
    await this.ensureInstructorExists(user.id);
    const [course] = await db.insert(courses).values({instructorId: user.id, 
    title: data.title, description: data.description, status: 'draft'}).returning();
    return course;
  },

  async listPublishedCourses(page = 1, limit = 20, search?: string) {
    const where = and(eq(courses.status, 'published'), search ? ilike(courses.title, `%${search}%`) : undefined);
    const [row] = await db.select({ total: count() }).from(courses).where(where);
    const total = Number(row?.total ?? 0);
    const items = await db
      .select({
        id: courses.id,
        instructorId: courses.instructorId,
        title: courses.title,
        description: courses.description,
        status: courses.status,
        createdAt: courses.createdAt,
        instructorName: users.fullName,
        instructorEmail: users.email,
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(where)
      .limit(limit)
      .offset((page - 1) * limit);
    return { items, total, page, limit };
  },

  async getCourseDetails(courseId: string) {
    const details = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: { chapters: { orderBy: asc(chapters.orderIndex), with: { lessons: { orderBy: asc(lessons.orderIndex) } } } }
    });
    if (!details) throw Errors.NotFound('Course');
    const [instUser] = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, details.instructorId));
    return {
      ...details,
      instructorName: instUser?.fullName || 'Instructor',
      instructorEmail: instUser?.email,
    };
  },

  async updateCourse(
    courseId: string,
    user: AuthUser,
    data: { title?: string; description?: string; status?: 'draft' | 'published' }
  ) {
    // TODO:
    // 1. Gọi await this.verifyCourseOwnership(courseId, user)
    // 2. Update bảng courses theo courseId và return bản ghi mới
    await this.verifyCourseOwnership(courseId, user);
    const [updated] = await db.update(courses).set({title: data.title, description: data.description, status: data.status})
    .where(eq(courses.id, courseId)).returning();
    return updated;
  },

  async deleteCourse(courseId: string, user: AuthUser) {
    // TODO:
    // 1. Gọi await this.verifyCourseOwnership(courseId, user)
    // 2. Xóa bản ghi trong bảng courses (các bảng con tự động cascade)
    await this.verifyCourseOwnership(courseId, user);
    await db.delete(courses).where(eq(courses.id, courseId));
  },

  // ==========================================
  // CHAPTERS CRUD
  // ==========================================
  async createChapter(
    courseId: string,
    user: AuthUser,
    data: { title: string; orderIndex?: number }
  ) {
    // TODO:
    // 1. Gọi await this.verifyCourseOwnership(courseId, user)
    // 2. Nếu data.orderIndex không được truyền vào:
    //    Truy vấn MAX(chapters.orderIndex) của courseId hiện tại, rồi lấy max + 1 (nếu chưa có chương nào thì bằng 1)
    // 3. Insert vào bảng chapters (Constraint 6: nếu bị trùng orderIndex, bắt lỗi Postgres mã '23505' và ném Errors.Conflict('DUPLICATE_ORDER_INDEX', ...))
    // 4. Return chương vừa tạo
    await this.verifyCourseOwnership(courseId, user);
    let index = data.orderIndex;
    if (index === undefined || index === null){
      const [row] = await db
        .select({ maxOrder: sql<number>`coalesce(max(${chapters.orderIndex}), 0)` })
        .from(chapters)
        .where(eq(chapters.courseId, courseId)); 
      index = Number(row?.maxOrder ?? 0) + 1;
    }
    try {
      const [chapter] = await db.insert(chapters).values({courseId: courseId, title: data.title, orderIndex: index}).returning();
      return chapter;
    }
    catch (err: any){
      const code = err.code ?? err.cause?.code;
      if (code === '23505') {
        throw Errors.Conflict('DUPLICATE_ORDER_INDEX', 'Duplicated order index');
      }
      throw err;
    }
  },

  async updateChapter(
    chapterId: string,
    user: AuthUser,
    data: { title?: string; orderIndex?: number }
  ) {
    // TODO:
    // 1. Tìm chapter theo chapterId. Nếu không có -> throw Errors.NotFound('Chapter')
    // 2. Gọi await this.verifyCourseOwnership(chapter.courseId, user)
    // 3. Update chapter và return kết quả (bắt lỗi trùng orderIndex -> 409 Conflict)
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (!chapter) throw Errors.NotFound('Chapter');
    await this.verifyCourseOwnership(chapter.courseId, user);
    try {
      const [updated] = await db.update(chapters).set({title: data.title, orderIndex: data.orderIndex})
      .where(eq(chapters.id, chapterId)).returning();
      return updated;
    }
    catch (err: any){
      const code = err.code ?? err.cause?.code;
      if (code === '23505') {
        throw Errors.Conflict('DUPLICATE_ORDER_INDEX', 'Duplicated order index');
      }
      throw err;
    }
  },

  async deleteChapter(chapterId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm chapter theo chapterId -> kiểm tra quyền sở hữu qua chapter.courseId
    // 2. Xóa chapter
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (!chapter) throw Errors.NotFound('Chapter');
    await this.verifyCourseOwnership(chapter.courseId, user);
    
    try {
      await db.delete(chapters).where(eq(chapters.id, chapterId));
    } catch (err: any) {
      const code = err.code ?? err.cause?.code;
      if (code === '23503') {
        throw Errors.Conflict('CHAPTER_HAS_LEARNER_PROGRESS', 'Cannot delete a chapter that learners have already reached.');
      }
      throw err;
    }
  },

  // ==========================================
  // LESSONS CRUD
  // ==========================================
  async createLesson(
    chapterId: string,
    user: AuthUser,
    data: { title: string; orderIndex?: number }
  ) {
    // TODO:
    // 1. Tìm chapter theo chapterId -> nếu không có ném 404
    // 2. Gọi await this.verifyCourseOwnership(chapter.courseId, user)
    // 3. Tự động tính orderIndex = MAX(lessons.orderIndex) + 1 trong phạm vi chapterId nếu không truyền vào
    // 4. Insert vào bảng lessons và return
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (chapter === undefined) throw Errors.NotFound('Chapter');
    await this.verifyCourseOwnership(chapter.courseId, user);

    let index = data.orderIndex;
    if (index === undefined || index === null){
      const [row] = await db
        .select({ maxOrder: sql<number>`coalesce(max(${lessons.orderIndex}), 0)` })
        .from(lessons)
        .where(eq(lessons.chapterId, chapterId)); 
      index = Number(row?.maxOrder ?? 0) + 1;
    }
    try {
      const [lesson] = await db.insert(lessons).values({chapterId: chapterId, title: data.title, orderIndex: index}).returning();
      return lesson;
    }
    catch (err: any){
      const code = err.code ?? err.cause?.code;
      if (code === '23505') {
        throw Errors.Conflict('DUPLICATE_ORDER_INDEX', 'Duplicated order index');
      }
      throw err;
    }
  },

  async updateLesson(
    lessonId: string,
    user: AuthUser,
    data: { title?: string; orderIndex?: number }
  ) {
    // TODO:
    // 1. Tìm lesson kèm thông tin chapter để lấy courseId -> kiểm tra verifyCourseOwnership
    // 2. Update lesson và return
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: { chapter: true },
    });
    if (!lesson) throw Errors.NotFound('Lesson');
    await this.verifyCourseOwnership(lesson.chapter.courseId, user);

    try {
      const [updated] = await db.update(lessons).set({title: data.title, orderIndex: data.orderIndex})
      .where(eq(lessons.id, lessonId)).returning();
      return updated;
    }
    catch (err: any){
      const code = err.code ?? err.cause?.code;
      if (code === '23505') {
        throw Errors.Conflict('DUPLICATE_ORDER_INDEX', 'Duplicated order index');
      }
      throw err;
    }
  },

  async deleteLesson(lessonId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm lesson -> lấy chapter.courseId -> kiểm tra verifyCourseOwnership
    // 2. Xóa lesson
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: { chapter: true },
    });
    if (!lesson) throw Errors.NotFound('Lesson');
    await this.verifyCourseOwnership(lesson.chapter.courseId, user);

    try {
      await db.delete(lessons).where(eq(lessons.id, lessonId));
    } catch (err: any) {
      const code = err.code ?? err.cause?.code;
      if (code === '23503') {
        throw Errors.Conflict('LESSON_HAS_LEARNER_PROGRESS', 'Cannot delete a lesson that learners have already reached.');
      }
      throw err;
    }
  },

  // ==========================================
  // MATERIALS CRUD
  // ==========================================
  async createMaterial(
    lessonId: string,
    user: AuthUser,
    data: {
      type: 'video' | 'markdown' | 'slide';
      title: string;
      contentUrl?: string;
      textContent?: string;
      metadata?: Record<string, unknown>;
      isRagSource?: boolean;
    }
  ) {
    // TODO:
    // 1. Tìm lesson -> chapter -> kiểm tra verifyCourseOwnership(chapter.courseId, user)
    // 2. Gọi this.validateMaterialDomain(data) để kiểm tra Constraint 7 & Constraint 8
    // 3. Insert vào bảng materials và return
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: { chapter: true },
    });
    if (!lesson) throw Errors.NotFound('Lesson');
    await this.verifyCourseOwnership(lesson.chapter.courseId, user);
    this.validateMaterialDomain(data);

    const [material] = await db.insert(materials).values({lessonId: lessonId, type: data.type, 
      title: data.title, contentUrl: data.contentUrl, textContent: data.textContent,
      metadata: data.metadata, isRagSource: data.isRagSource ?? false,
    }).returning();
    return material;
  },

  async updateMaterial(
    materialId: string,
    user: AuthUser,
    data: Partial<{
      type: 'video' | 'markdown' | 'slide';
      title: string;
      contentUrl: string;
      textContent: string;
      metadata: Record<string, unknown>;
      isRagSource: boolean;
    }>
  ) {
    // TODO:
    // 1. Tìm material hiện tại -> lấy lesson -> chapter -> kiểm tra verifyCourseOwnership
    // 2. Gộp trạng thái cũ của material với data mới rồi gọi this.validateMaterialDomain(...)
    // 3. Update bảng materials và return
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId),
      with: { lesson: { with: { chapter: true } } },
    });
    if (!material) throw Errors.NotFound('Material');
    await this.verifyCourseOwnership(material.lesson.chapter.courseId, user);

    this.validateMaterialDomain({
      type: data.type ?? material.type,
      contentUrl: data.contentUrl ?? material.contentUrl,
      textContent: data.textContent ?? material.textContent,
      isRagSource: data.isRagSource ?? material.isRagSource ?? false,
    });

    const [updated] = await db.update(materials).set({type: data.type, title: data.title,
      contentUrl: data.contentUrl, textContent: data.textContent,
      metadata: data.metadata, isRagSource: data.isRagSource,
    })
      .where(eq(materials.id, materialId)).returning();
    return updated;
  },

  async deleteMaterial(materialId: string, user: AuthUser) {
    // TODO:
    // 1. Tìm material -> lấy lesson -> chapter -> kiểm tra verifyCourseOwnership
    // 2. Xóa material
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId),
      with: { lesson: { with: { chapter: true } } },
    });
    if (!material) throw Errors.NotFound('Material');
    await this.verifyCourseOwnership(material.lesson.chapter.courseId, user);

    await db.delete(materials).where(eq(materials.id, materialId));
  },
};
