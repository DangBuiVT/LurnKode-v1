/**
 * Type definitions for M1 (Auth & Identity) and M2 (Learning Management) APIs
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// -------------------------------------------------------------
// M1: Auth & User Types
// -------------------------------------------------------------
export type UserRole = "Admin" | "Instructor" | "Learner";
export type UserStatus = "active" | "locked";

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponseData {
  userId: string;
  role: UserRole;
  user: ApiUser;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

// -------------------------------------------------------------
// M2: Learning Management Types
// -------------------------------------------------------------
export type CourseStatus = "draft" | "published";
export type MaterialType = "video" | "markdown" | "slide";

export interface BackendCourse {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  createdAt: string;
}

export interface BackendMaterial {
  id: string;
  lessonId: string;
  type: MaterialType;
  title: string;
  contentUrl: string | null;
  textContent: string | null;
  metadata?: Record<string, unknown> | null;
  isRagSource: boolean;
  createdAt: string;
}

export interface BackendLesson {
  id: string;
  chapterId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  materials?: BackendMaterial[];
}

export interface BackendChapter {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  lessons: BackendLesson[];
}

export interface BackendCourseDetail extends BackendCourse {
  chapters: BackendChapter[];
}

export interface BackendEnrollment {
  id: string;
  learnerId: string;
  courseId: string;
  lastAccessedLessonId: string | null;
  createdAt: string;
  course?: BackendCourse;
  lastAccessedLesson?: BackendLesson | null;
}

export interface BackendDiscussion {
  id: string;
  lessonId: string;
  userId: string;
  parentId: string | null;
  textContent: string;
  createdAt: string;
  updatedAt: string;
  replies?: BackendDiscussion[];
}

export interface BackendNotification {
  id: string;
  userId: string;
  title: string;
  textMsg: string;
  isRead: boolean;
  createdAt: string;
}

