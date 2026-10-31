export interface MaterialSource {
  id: string;
  courseId: string;
  chapterId: string;
  lessonId: string;
  title: string;
  textContent: string | null;
  contentUrl: string | null;
  type: "markdown" | "video" | "slide";
  isRagSource: boolean;
  courseStatus: "draft" | "published";
}
