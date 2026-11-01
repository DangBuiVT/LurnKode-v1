export type StudioCourseStatus = "Published" | "Draft" | "Archived";

export interface StudioCourse {
  id: string;
  title: string;
  description: string;
  status: StudioCourseStatus;
  enrolledCount: number;
  thumbnailUrl?: string;
  updatedAt?: string;
  category?: string;
  createdAt?: string;
}
