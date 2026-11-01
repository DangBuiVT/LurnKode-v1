import { apiClient } from "./client";
import {
  BackendCourse,
  BackendCourseDetail,
  BackendChapter,
  BackendLesson,
  BackendMaterial,
} from "./types";

export const coursesApi = {
  /**
   * Danh sách khóa học đã xuất bản (public, có tìm kiếm và phân trang)
   */
  async listPublished(query?: { page?: number; limit?: number; search?: string }): Promise<BackendCourse[]> {
    return apiClient<BackendCourse[]>("/api/v1/courses", { query });
  },

  /** Courses owned by the authenticated instructor, including drafts. */
  async listMine(query?: { page?: number; limit?: number }): Promise<BackendCourse[]> {
    return apiClient<BackendCourse[]>("/api/v1/my/courses", { query });
  },

  /**
   * Chi tiết khóa học bao gồm các chapters và lessons
   */
  async getById(courseId: string): Promise<BackendCourseDetail> {
    return apiClient<BackendCourseDetail>(`/api/v1/courses/${courseId}`);
  },

  /**
   * Tạo khóa học mới (Role: Instructor, Admin)
   */
  async create(data: { title: string; description?: string }): Promise<BackendCourse> {
    return apiClient<BackendCourse>("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Cập nhật thông tin / trạng thái khóa học (Chủ sở hữu hoặc Admin)
   */
  async update(
    courseId: string,
    data: { title?: string; description?: string; status?: "draft" | "published" }
  ): Promise<BackendCourse> {
    return apiClient<BackendCourse>(`/api/v1/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Xóa khóa học (Chủ sở hữu hoặc Admin)
   */
  async delete(courseId: string): Promise<void> {
    return apiClient<void>(`/api/v1/courses/${courseId}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------
  // Chapters Management
  // -------------------------------------------------------------
  async createChapter(
    courseId: string,
    data: { title: string; orderIndex?: number }
  ): Promise<BackendChapter> {
    return apiClient<BackendChapter>(`/api/v1/courses/${courseId}/chapters`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateChapter(
    chapterId: string,
    data: { title?: string; orderIndex?: number }
  ): Promise<BackendChapter> {
    return apiClient<BackendChapter>(`/api/v1/chapters/${chapterId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteChapter(chapterId: string): Promise<void> {
    return apiClient<void>(`/api/v1/chapters/${chapterId}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------
  // Lessons Management
  // -------------------------------------------------------------
  async createLesson(
    chapterId: string,
    data: { title: string; orderIndex?: number }
  ): Promise<BackendLesson> {
    return apiClient<BackendLesson>(`/api/v1/chapters/${chapterId}/lessons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateLesson(
    lessonId: string,
    data: { title?: string; orderIndex?: number }
  ): Promise<BackendLesson> {
    return apiClient<BackendLesson>(`/api/v1/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteLesson(lessonId: string): Promise<void> {
    return apiClient<void>(`/api/v1/lessons/${lessonId}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------
  // Materials Management
  // -------------------------------------------------------------
  async createMaterial(
    lessonId: string,
    data: {
      type: "video" | "markdown" | "slide";
      title: string;
      contentUrl?: string;
      textContent?: string;
      isRagSource?: boolean;
    }
  ): Promise<BackendMaterial> {
    return apiClient<BackendMaterial>(`/api/v1/lessons/${lessonId}/materials`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterial(
    materialId: string,
    data: {
      type?: "video" | "markdown" | "slide";
      title?: string;
      contentUrl?: string;
      textContent?: string;
      isRagSource?: boolean;
    }
  ): Promise<BackendMaterial> {
    return apiClient<BackendMaterial>(`/api/v1/materials/${materialId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterial(materialId: string): Promise<void> {
    return apiClient<void>(`/api/v1/materials/${materialId}`, {
      method: "DELETE",
    });
  },
};

