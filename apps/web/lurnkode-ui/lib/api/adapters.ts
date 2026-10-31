import {
  BackendCourse,
  BackendCourseDetail,
  BackendEnrollment,
} from "./types";
import { Course, CourseDetail, Chapter, Lesson, CourseStatus } from "@/types/course";
import { mockDb, CURRENT_USER } from "@/lib/db";

/**
 * Chuyển đổi dữ liệu từ Backend M2 sang định dạng Course của M5 UI
 */
export function adaptBackendCourse(
  bCourse: BackendCourse,
  enrollment?: BackendEnrollment | null
): Course {
  const status: CourseStatus = enrollment
    ? enrollment.lastAccessedLessonId
      ? "in_progress"
      : "in_progress"
    : "not_enrolled";

  return {
    id: bCourse.id,
    slug: bCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: bCourse.title,
    description: bCourse.description || "",
    instructor: "LurnKode Instructor",
    status,
    progress: enrollment ? 0 : 0,
    category: "Software Engineering",
    createdAt: bCourse.createdAt,
  };
}

/**
 * Chuyển đổi dữ liệu chi tiết từ Backend M2 sang định dạng CourseDetail của M5 UI
 */
export function adaptBackendCourseDetail(
  detail: BackendCourseDetail,
  enrollment?: BackendEnrollment | null
): CourseDetail {
  let totalLessons = 0;
  let unlockedRank = 0;

  // Gom các bài học để tính toán thứ tự toàn cục
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

      // Logic mở khóa tuần tự:
      // Bài đầu tiên (rank 1) luôn mở khi đã enroll; bài kế tiếp mở khi bài trước đã xong.
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
      createdAt: new Date(ch.createdAt).toLocaleDateString("en-GB"),
      isLocked: lessons.every((l) => l.status === "locked"),
      lessons,
    };
  });

  return {
    id: detail.id,
    slug: detail.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: detail.title,
    description: detail.description || "",
    instructor: "LurnKode Instructor",
    status,
    overallProgress,
    category: "Software Engineering",
    createdAt: detail.createdAt,
    chapters,
  };
}

