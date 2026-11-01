import { Course, CourseDetail } from "@/types/course";
import { coursesApi, enrollmentsApi, adaptBackendCourse, adaptBackendCourseDetail } from "@/lib/api";

/**
 * Lấy danh sách khóa học bất đồng bộ từ Backend M2 qua API
 */
export async function fetchCourses(): Promise<Course[]> {
  try {
    const [backendCourses, myEnrollments] = await Promise.all([
      coursesApi.listPublished(),
      enrollmentsApi.getMyEnrollments().catch(() => []),
    ]);

    if (backendCourses && backendCourses.length > 0) {
      return backendCourses.map((bCourse) => {
        const enrollment = myEnrollments.find((e) => e.courseId === bCourse.id);
        return adaptBackendCourse(bCourse, enrollment);
      });
    }
  } catch (err) {
    console.error("Failed to fetch courses from API", err);
  }

  return [];
}

/**
 * Lấy chi tiết khóa học kèm chapters & lessons từ Backend M2 qua API
 */
export async function fetchCourseById(identifier: string): Promise<CourseDetail | undefined> {
  try {
    const [detail, myEnrollments] = await Promise.all([
      coursesApi.getById(identifier),
      enrollmentsApi.getMyEnrollments().catch(() => []),
    ]);

    if (detail) {
      const enrollment = myEnrollments.find((e) => e.courseId === detail.id);
      return adaptBackendCourseDetail(detail, enrollment);
    }
  } catch (err) {
    console.error("Failed to fetch course detail from API", err);
  }

  return undefined;
}
