import { Course, CourseDetail, CourseStatus } from "@/types/course";
import { mockDb, CURRENT_USER } from "@/lib/db";

export function getCourses(): Course[] {
  return mockDb
    .getCourses({ status: "published" })
    .map((c) => {
      const instructor = mockDb.getUserById(c.instructor_id);
      const enrollment = mockDb.getEnrollment(CURRENT_USER.id, c.id);
      const hierarchy = mockDb.getCourseHierarchy(c.id, CURRENT_USER.id);

      const progress = hierarchy?.overall_progress || 0;
      const status: CourseStatus = enrollment
        ? progress === 100
          ? "completed"
          : "in_progress"
        : "not_enrolled";

      return {
        id: c.id.replace("c-", ""),
        slug: c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: c.title,
        description: c.description || "",
        instructor: instructor?.name || "Instructor",
        status,
        progress,
        category: c.category || "General",
        createdAt: c.created_at,
      };
    });
}

export const COURSES: Course[] = getCourses();

export function getCourseByIdOrSlug(identifier: string): CourseDetail | undefined {
  // Normalize identifier
  const cleanId = identifier.startsWith("c-") ? identifier : `c-${identifier}`;
  const course =
    mockDb.getCourseById(cleanId) ||
    mockDb.getCourses().find((c) => {
      const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return slug === identifier || c.id === identifier;
    });

  if (!course) return undefined;

  const hierarchy = mockDb.getCourseHierarchy(course.id, CURRENT_USER.id);
  if (!hierarchy) return undefined;

  return {
    id: course.id.replace("c-", ""),
    slug: course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: course.title,
    description:
      course.description ||
      "A comprehensive curriculum covering essential data structures, search algorithms, and algorithmic complexity analysis.",
    instructor: hierarchy.instructor.name,
    status: hierarchy.enrollment ? "in_progress" : "not_enrolled",
    overallProgress: hierarchy.overall_progress,
    category: course.category || "General",
    createdAt: course.created_at,
    chapters: hierarchy.chapters.map((ch) => ({
      id: ch.id,
      chapterNumber: ch.order_index,
      title: ch.title,
      createdAt: new Date(ch.created_at).toLocaleDateString("en-GB"),
      isLocked: ch.is_locked,
      lessons: ch.lessons.map((l) => ({
        id: l.id,
        orderIndex: `${ch.order_index}.${l.order_index}`,
        lessonNumber: l.order_index,
        title: l.title,
        materials: l.materials.map((m) => m.type),
        status: l.is_completed
          ? "completed"
          : l.is_active
          ? "in_progress"
          : "locked",
        duration: "20 min",
      })),
    })),
  };
}
