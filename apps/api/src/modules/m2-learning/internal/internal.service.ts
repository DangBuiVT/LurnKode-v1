// apps/api/src/modules/m2-learning/internal/internal.service.ts
import { db } from '../../../db';
import { courses, chapters, lessons, materials } from '../../../db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const InternalRagService = {
  // GET /internal/rag-materials (Mục 6.2.4)
  async exportRagMaterials() {
    // TODO:
    // Truy vấn JOIN 4 bảng (materials -> lessons -> chapters -> courses) với điều kiện:
    // - materials.isRagSource === true
    // - materials.type === 'markdown' (Constraint 7)
    // - courses.status === 'published'
    // Trả về danh sách gồm: materialId, title, textContent, lessonId, lessonTitle, chapterId, chapterTitle, courseId, courseTitle (để M4 làm Citation)
    const rows = await db
      .select({
        materialId: materials.id,
        title: materials.title,
        textContent: materials.textContent,
        metadata: materials.metadata,
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        courseId: courses.id,
        courseTitle: courses.title,
      })
      .from(materials)
      .innerJoin(lessons, eq(materials.lessonId, lessons.id))
      .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .where(
        and(
          eq(materials.isRagSource, true),
          eq(materials.type, 'markdown'),
          eq(courses.status, 'published')
        )
      )
      .orderBy(asc(courses.title), asc(chapters.orderIndex), asc(lessons.orderIndex));

    return rows;
  },
};