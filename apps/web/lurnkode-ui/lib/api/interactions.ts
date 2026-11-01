import { apiClient } from "./client";
import { BackendDiscussion, BackendNotification } from "./types";

export const interactionsApi = {
  /**
   * Lấy danh sách thảo luận của bài học (đã gom nhóm cấu trúc cây cha-con)
   */
  async listLessonDiscussions(lessonId: string): Promise<BackendDiscussion[]> {
    return apiClient<BackendDiscussion[]>(`/api/v1/lessons/${lessonId}/discussions`);
  },

  /**
   * Tạo câu hỏi gốc hoặc trả lời bình luận trong bài học
   */
  async createDiscussion(
    lessonId: string,
    data: { textContent: string; parentId?: string }
  ): Promise<BackendDiscussion> {
    return apiClient<BackendDiscussion>(`/api/v1/lessons/${lessonId}/discussions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Chỉnh sửa bình luận (Chỉ tác giả)
   */
  async updateDiscussion(discussionId: string, textContent: string): Promise<BackendDiscussion> {
    return apiClient<BackendDiscussion>(`/api/v1/discussions/${discussionId}`, {
      method: "PATCH",
      body: JSON.stringify({ textContent }),
    });
  },

  /**
   * Xóa bình luận (Tác giả hoặc Admin)
   */
  async deleteDiscussion(discussionId: string): Promise<void> {
    return apiClient<void>(`/api/v1/discussions/${discussionId}`, {
      method: "DELETE",
    });
  },

  /**
   * Lấy danh sách thông báo của người dùng hiện tại
   */
  async getNotifications(): Promise<BackendNotification[]> {
    return apiClient<BackendNotification[]>("/api/v1/notifications");
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markNotificationRead(notificationId: string): Promise<BackendNotification> {
    return apiClient<BackendNotification>(`/api/v1/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },
};

