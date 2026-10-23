/** Giả định skeleton: M2 hỗ trợ cả PDF/TXT; ID dự kiến UUID, cần xác nhận khi tích hợp. */
export interface MaterialSource {
  id: string;
  courseId: string;
  chapterId: string;
  lessonId: string;
  fileName: string | null;
  title: string;
  content: string | null;
  type: "markdown" | "txt" | "pdf" | "video" | "slide";
  isRagSource: boolean;
  courseStatus: "draft" | "published";
}
