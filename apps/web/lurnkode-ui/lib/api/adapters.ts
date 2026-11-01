import {
  BackendCourse,
  BackendCourseDetail,
  BackendEnrollment,
} from "./types";
import { Course, CourseDetail, Chapter, Lesson, CourseStatus } from "@/types/course";

function inferCategory(title: string, desc?: string | null): string {
  const text = `${title} ${desc || ""}`.toLowerCase();
  if (text.includes("ai") || text.includes("rag") || text.includes("vector") || text.includes("machine learning")) {
    return "Artificial Intelligence";
  }
  if (text.includes("web") || text.includes("next.js") || text.includes("react") || text.includes("frontend")) {
    return "Web Development";
  }
  if (text.includes("data structure") || text.includes("algorithm") || text.includes("dữ liệu") || text.includes("giải thuật")) {
    return "Computer Science";
  }
  if (text.includes("database") || text.includes("sql") || text.includes("cơ sở dữ liệu")) {
    return "Data & Systems";
  }
  return "Software Engineering";
}

/**
 * Transforms Backend M2 course item into M5 Course view model
 */
export function adaptBackendCourse(
  bCourse: BackendCourse,
  enrollment?: BackendEnrollment | null
): Course {
  const isEnrolled = !!enrollment;
  const progress = enrollment ? enrollment.progress ?? 0 : 0;
  const isCompleted =
    isEnrolled &&
    (progress >= 100 || enrollment.status === "completed");

  const status: CourseStatus = !isEnrolled
    ? "not_enrolled"
    : isCompleted
    ? "completed"
    : "in_progress";

  const instructor =
    bCourse.instructorName ||
    bCourse.instructor?.fullName ||
    "Instructor";

  return {
    id: bCourse.id,
    slug: bCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: bCourse.title,
    description: bCourse.description || "",
    instructor,
    status,
    progress,
    category: inferCategory(bCourse.title, bCourse.description),
    createdAt: bCourse.createdAt,
  };
}

/**
 * Transforms Backend M2 course detail into M5 CourseDetail view model
 */
export function adaptBackendCourseDetail(
  detail: BackendCourseDetail,
  enrollment?: BackendEnrollment | null
): CourseDetail {
  let totalLessons = 0;
  let unlockedRank = 0;

  // Collect lessons to compute sequence
  const allLessons: Array<{ id: string; chapterOrder: number; lessonOrder: number }> = [];
  detail.chapters.forEach((ch) => {
    ch.lessons.forEach((l) => {
      totalLessons += 1;
      allLessons.push({
        id: l.id,
        chapterOrder: ch.orderIndex,
        lessonOrder: l.orderIndex,
      });
    });
  });

  allLessons.sort((a, b) => {
    if (a.chapterOrder !== b.chapterOrder) return a.chapterOrder - b.chapterOrder;
    return a.lessonOrder - b.lessonOrder;
  });

  if (enrollment?.lastAccessedLessonId) {
    const idx = allLessons.findIndex((l) => l.id === enrollment.lastAccessedLessonId);
    if (idx !== -1) {
      unlockedRank = idx + 1;
    }
  }

  const overallProgress =
    totalLessons > 0 ? Math.round((unlockedRank / totalLessons) * 100) : 0;

  const status: CourseStatus = !enrollment
    ? "not_enrolled"
    : overallProgress >= 100
    ? "completed"
    : "in_progress";

  const chapters: Chapter[] = detail.chapters.map((ch) => {
    const lessons: Lesson[] = ch.lessons.map((l) => {
      const lessonRank =
        allLessons.findIndex((item) => item.id === l.id) + 1;

      // Sequential unlock logic:
      // First lesson is unlocked when enrolled; next unlocked after completing previous.
      let lessonStatus: "completed" | "in_progress" | "locked" = "locked";
      if (!enrollment) {
        lessonStatus = "locked";
      } else if (lessonRank <= unlockedRank) {
        lessonStatus = "completed";
      } else if (lessonRank === unlockedRank + 1) {
        lessonStatus = "in_progress";
      } else {
        lessonStatus = "locked";
      }

      return {
        id: l.id,
        orderIndex: `${ch.orderIndex}.${l.orderIndex}`,
        lessonNumber: l.orderIndex,
        title: l.title,
        materials: ["markdown"],
        status: lessonStatus,
        duration: "20 min",
      };
    });

    return {
      id: ch.id,
      chapterNumber: ch.orderIndex,
      title: ch.title,
      createdAt: new Date(ch.createdAt).toLocaleDateString("en-US"),
      isLocked: lessons.every((l) => l.status === "locked"),
      lessons,
    };
  });

  const instructor =
    detail.instructorName ||
    detail.instructor?.fullName ||
    "Instructor";

  return {
    id: detail.id,
    slug: detail.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: detail.title,
    description: detail.description || "",
    instructor,
    status,
    overallProgress,
    category: inferCategory(detail.title, detail.description),
    createdAt: detail.createdAt,
    chapters,
  };
}
