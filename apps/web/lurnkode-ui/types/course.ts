export type CourseStatus = "not_enrolled" | "in_progress" | "completed";

export type LessonStatus = "completed" | "in_progress" | "locked";

export type CourseMaterialType = "video" | "markdown" | "code" | "slide";

export interface Lesson {
  id: string;
  orderIndex: string; // e.g. "1.1", "1.2", "2.1"
  lessonNumber: number; // e.g. 1
  title: string;
  materials?: CourseMaterialType[];
  status: LessonStatus;
  duration?: string;
}

export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  createdAt?: string;
  isLocked?: boolean;
  lessons: Lesson[];
}

export interface CourseDetail extends Course {
  overallProgress: number; // percentage (e.g. 33)
  chapters: Chapter[];
}

export interface Course {
  id: string;
  slug?: string;
  title: string;
  description: string;
  instructor: string;
  status: CourseStatus;
  thumbnailUrl?: string;
  progress?: number;
  category?: string;
  createdAt?: string;
}
