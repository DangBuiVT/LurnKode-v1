/**
 * M2 - Course & Material Management: Relational Database Schema Types
 * Based on the Technical Specification & Drizzle ORM model.
 */

export type UserRole = "learner" | "instructor" | "admin";
export type CourseStatus = "draft" | "published" | "archived";
export type MaterialType = "video" | "markdown" | "slide";

// 1. Users (Shared RBAC entity from M1)
export interface User {
  id: string; // uuid
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// 2. Courses (Tier 1)
export interface Course {
  id: string; // uuid
  instructor_id: string; // references users.id
  title: string;
  description: string | null;
  status: CourseStatus;
  category?: string;
  created_at: string;
}

// 3. Chapters (Tier 2)
export interface Chapter {
  id: string; // uuid
  course_id: string; // references courses.id (onDelete: cascade)
  title: string;
  order_index: number;
  created_at: string;
}

// 4. Lessons (Tier 3)
export interface Lesson {
  id: string; // uuid
  chapter_id: string; // references chapters.id (onDelete: cascade)
  title: string;
  order_index: number;
  created_at: string;
}

// 5. Materials (Tier 4)
export interface Material {
  id: string; // uuid
  lesson_id: string; // references lessons.id (onDelete: cascade)
  type: MaterialType;
  title: string;
  content: string | null;
  is_rag_source: boolean; // Flagged for M4 AI Tutor vector embedding
  created_at: string;
}

// 6. Enrollments (Learner Course Progress Tracking)
export interface Enrollment {
  id: string; // uuid
  learner_id: string; // references users.id (onDelete: cascade)
  course_id: string; // references courses.id (onDelete: cascade)
  last_accessed_lesson_id: string | null; // references lessons.id (onDelete: restrict)
  last_accessed_at?: string; // timestamp of most recent activity for smart resume
  completed_lesson_ids?: string[]; // array of completed lesson IDs for sequential logic
  created_at: string;
}

// ==========================================
// Aggregated & View Hierarchy Models
// ==========================================

export interface LessonWithMaterials extends Lesson {
  materials: Material[];
  is_locked: boolean;
  is_completed: boolean;
  is_active: boolean;
}

export interface ChapterWithLessons extends Chapter {
  lessons: LessonWithMaterials[];
  is_locked: boolean;
}

export interface CourseWithHierarchy extends Course {
  instructor: User;
  chapters: ChapterWithLessons[];
  enrollment?: Enrollment | null;
  overall_progress: number; // 0 - 100 percentage
}

// ==========================================
// Quiz & Assessment Schema (Section 4.4 / 5.4)
// ==========================================

export type QuestionType = "single_choice" | "multiple_choice";

export interface QuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: string;
  quiz_id?: string;
  prompt: string;
  type: QuestionType;
  points: number;
  options: QuizOption[];
  explanation?: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  lesson_id?: string;
  title: string;
  description: string;
  time_limit_minutes: number; // 0 = unlimited
  passing_score_percentage: number; // e.g. 70%
  max_attempts: number; // 0 = unlimited
  questions: QuizQuestion[];
  created_at: string;
  updated_at?: string;
}

export interface QuizQuestionFeedback {
  question_id: string;
  is_correct: boolean;
  user_answers: string[]; // option ids
  correct_answers: string[]; // option ids
  points_earned: number;
  max_points: number;
  explanation?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  learner_id: string;
  learner_name?: string;
  learner_email?: string;
  answers: Record<string, string[]>; // questionId -> selected optionId(s)
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds?: number;
  submitted_at: string;
  feedback: QuizQuestionFeedback[];
}

