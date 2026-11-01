import { Course, CourseDetail } from "@/types/course";
import { coursesApi, enrollmentsApi, adaptBackendCourse, adaptBackendCourseDetail } from "@/lib/api";

/**
 * Lấy danh sách khóa học bất đồng bộ từ Backend M2 qua API
 */
export async function fetchCourses(): Promise<Course[]> {
  const [backendCourses, myEnrollments] = await Promise.all([
    coursesApi.listPublished(),
    enrollmentsApi.getMyEnrollments().catch(() => []),
  ]);

  return backendCourses.map((bCourse) => {
    const enrollment = myEnrollments.find((e) => e.courseId === bCourse.id);
    return adaptBackendCourse(bCourse, enrollment);
  });
}

/**
 * Lấy chi tiết khóa học kèm chapters & lessons từ Backend M2 qua API
 */
export async function fetchCourseById(identifier: string): Promise<CourseDetail | undefined> {
  const [detail, myEnrollments] = await Promise.all([
    coursesApi.getById(identifier),
    enrollmentsApi.getMyEnrollments().catch(() => []),
  ]);

  const enrollment = myEnrollments.find((e) => e.courseId === detail.id);
  return adaptBackendCourseDetail(detail, enrollment);
}
