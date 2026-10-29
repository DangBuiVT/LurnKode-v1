"use client";

import { useEffect, useState } from "react";
import { LessonContentCard } from "@/components/learn/lesson-content-card";
import { LessonSubmissionCard } from "@/components/learn/lesson-submission-card";
import { LessonQuizCard } from "@/components/learn/lesson-quiz-card";
import { LessonSwitcher } from "@/components/learn/lesson-switcher";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { Course, Lesson, User, Material } from "@/lib/db/schema";
import { Award, FileEdit } from "lucide-react";

interface LearningViewProps {
  course: Course;
  lesson: Lesson;
  instructor: User;
  materials: Material[];
  allLessons: Lesson[];
  initialIsCompleted: boolean;
}

export function LearningView({
  course,
  lesson,
  instructor,
  materials,
  allLessons,
  initialIsCompleted,
}: LearningViewProps) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [assessmentTab, setAssessmentTab] = useState<"quiz" | "manual">("quiz");

  // Auto-record last accessed lesson for Approach 1 (Smart Auto-Resume)
  useEffect(() => {
    mockDb.touchLessonAccess(CURRENT_USER.id, course.id, lesson.id);
  }, [course.id, lesson.id]);

  const handleToggleComplete = () => {
    const newState = mockDb.toggleLessonCompleted(CURRENT_USER.id, course.id, lesson.id);
    setIsCompleted(newState);
  };

  const cleanCourseId = course.id.replace("c-", "");
  const lessonOrderIndex = `1.${lesson.order_index}`;

  // Find document/theory material if available
  const docMaterial = materials.find((m) => m.type === "markdown");
  const materialContent = docMaterial?.content || undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Switcher & Chapter Progress */}
      <LessonSwitcher
        courseId={cleanCourseId}
        courseTitle={course.title}
        currentLessonId={lesson.id}
        allLessons={allLessons.map((l) => ({
          id: l.id,
          title: `1.${l.order_index} ${l.title}`,
          order_index: l.order_index,
          is_locked: false,
        }))}
      />

      {/* 2-Column MVP Learning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Material Reader & Discussion */}
        <LessonContentCard
          lessonIndex={lessonOrderIndex}
          lessonTitle={lesson.title}
          instructorName={instructor.name}
          isCompleted={isCompleted}
          onToggleComplete={handleToggleComplete}
          markdownContent={materialContent}
        />

        {/* Right Column: Assessment Workspace (Quiz vs Manual Submission) */}
        <div className="space-y-4">
          {/* Assessment Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl border bg-muted/40 text-xs font-semibold">
            <button
              onClick={() => setAssessmentTab("quiz")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
                assessmentTab === "quiz"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="h-4 w-4 text-primary" />
              <span>Trắc nghiệm chấm tự động</span>
            </button>

            <button
              onClick={() => setAssessmentTab("manual")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
                assessmentTab === "manual"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="h-4 w-4 text-primary" />
              <span>Bài tập nộp tệp / text</span>
            </button>
          </div>

          {/* Active Assessment Panel */}
          {assessmentTab === "quiz" ? (
            <LessonQuizCard
              courseId={course.id}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              onQuizCompleted={(passed) => {
                if (passed) {
                  setIsCompleted(true);
                }
              }}
            />
          ) : (
            <LessonSubmissionCard lessonTitle={lesson.title} />
          )}
        </div>
      </div>
    </div>
  );
}
