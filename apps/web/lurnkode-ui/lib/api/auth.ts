import {
  apiClient,
  clearStoredToken,
  setStoredToken,
} from "./client";
import {
  AuthResponseData,
  LoginPayload,
  RegisterPayload,
  ApiUser,
} from "./types";

export const authApi = {
  /**
   * Đăng nhập người dùng (cấp Access Token + Cookie Refresh Token)
   */
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const data = await apiClient<AuthResponseData>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    return data;
  },

  /**
   * Đăng ký tài khoản Learner mới
   */
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const data = await apiClient<AuthResponseData>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    return data;
  },

  /**
   * Lấy thông tin định danh caller hiện tại từ M1
   */
  async me(): Promise<{ userId: string; role: string; user?: ApiUser }> {
    return apiClient<{ userId: string; role: string; user?: ApiUser }>("/api/v1/auth/me");
  },

  /**
   * Làm mới Access Token thông qua Refresh Token (trong HttpOnly Cookie)
   */
  async refresh(): Promise<AuthResponseData> {
    const data = await apiClient<AuthResponseData>("/api/v1/auth/refresh", {
      method: "POST",
    });
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    return data;
  },

  /**
   * Đăng xuất và thu hồi Refresh Session
   */
  async logout(): Promise<void> {
    try {
      await apiClient<void>("/api/v1/auth/logout", {
        method: "POST",
      });
    } finally {
      clearStoredToken();
    }
  },

  /**
   * Đổi mật khẩu
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiClient<void>("/api/v1/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

