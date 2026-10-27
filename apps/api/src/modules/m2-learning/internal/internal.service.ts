// apps/api/src/modules/m2-learning/internal/internal.service.ts
import { db } from '../../../db';
import { courses, chapters, lessons, materials } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export const InternalRagService = {
  // GET /internal/rag-materials (Mục 6.2.4)
  async exportRagMaterials() {
    // TODO:
    // Truy vấn JOIN 4 bảng (materials -> lessons -> chapters -> courses) với điều kiện:
    // - materials.isRagSource === true
    // - materials.type === 'markdown' (Constraint 7)
    // - courses.status === 'published'
    // Trả về danh sách gồm: materialId, title, textContent, lessonId, lessonTitle, chapterId, chapterTitle, courseId, courseTitle (để M4 làm Citation)
  },
};