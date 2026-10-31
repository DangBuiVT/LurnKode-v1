import { apiClient } from "./client";
import { BackendEnrollment, BackendMaterial } from "./types";

export const enrollmentsApi = {
  /**
   * Ghi danh vào khóa học (Role: Learner)
   */
  async enroll(courseId: string): Promise<BackendEnrollment> {
    return apiClient<BackendEnrollment>(`/api/v1/courses/${courseId}/enroll`, {
      method: "POST",
    });
  },

  /**
   * Lấy danh sách các khóa học mà người dùng hiện tại đã ghi danh
   */
  async getMyEnrollments(): Promise<BackendEnrollment[]> {
    return apiClient<BackendEnrollment[]>("/api/v1/my/enrollments");
  },

  /**
   * Kiểm tra quyền truy cập bài học tuần tự (Sequential Access) và lấy học liệu
   */
  async accessLesson(lessonId: string): Promise<BackendMaterial[]> {
    return apiClient<BackendMaterial[]>(`/api/v1/lessons/${lessonId}/access`);
  },

  /**
   * Đánh dấu hoàn thành bài học và cập nhật tiến độ học tập (Monotonic Progress)
   */
  async completeLesson(lessonId: string): Promise<BackendEnrollment> {
    return apiClient<BackendEnrollment>(`/api/v1/lessons/${lessonId}/complete`, {
      method: "POST",
    });
  },
};

