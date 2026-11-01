"use client";

import { useEffect, useState } from "react";
import { LessonContentCard } from "@/components/learn/lesson-content-card";
// import { LessonSubmissionCard } from "@/components/learn/lesson-submission-card";
import { LessonQuizCard } from "@/components/learn/lesson-quiz-card";
import { LessonSwitcher } from "@/components/learn/lesson-switcher";
import { enrollmentsApi } from "@/lib/api";
import { Course, Lesson, User, Material } from "@/lib/db/schema";
// import { Award, FileEdit } from "lucide-react";

interface LearningViewProps {
  course: Course;
  lesson: Lesson & { displayIndex?: string };
  instructor: User;
  materials: Material[];
  allLessons: Array<Lesson & { displayIndex?: string }>;
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
  // const [assessmentTab, setAssessmentTab] = useState<"quiz" | "manual">("quiz");
  const [fetchedMaterials, setFetchedMaterials] = useState<Material[]>([]);

  // Synchronize completion status with live backend enrollment
  useEffect(() => {
    let isMounted = true;
    enrollmentsApi
      .getMyEnrollments()
      .then((myEnrollments) => {
        if (!isMounted) return;
        const myEnrollment = myEnrollments.find(
          (e) => e.courseId === course.id || e.courseId === course.id.replace("c-", "")
        );
        if (myEnrollment) {
          if (!myEnrollment.lastAccessedLessonId) {
            setIsCompleted(false);
          } else {
            const currentIdx = allLessons.findIndex((l) => l.id === lesson.id);
            const lastIdx = allLessons.findIndex((l) => l.id === myEnrollment.lastAccessedLessonId);
            if (currentIdx !== -1 && lastIdx !== -1) {
              setIsCompleted(currentIdx <= lastIdx);
            }
          }
        } else {
          setIsCompleted(false);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [course.id, lesson.id, allLessons]);

  // Auto-fetch materials if not preloaded
  useEffect(() => {
    if (materials.length === 0) {
      let isMounted = true;
      enrollmentsApi
        .accessLesson(lesson.id)
        .then((raw) => {
          if (isMounted && raw && raw.length > 0) {
            setFetchedMaterials(
              raw.map((m) => ({
                id: m.id,
                lesson_id: m.lessonId,
                title: m.title,
                type: m.type as Material["type"],
                content: m.textContent || "",
                is_rag_source: m.isRagSource,
                created_at: m.createdAt,
              }))
            );
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [lesson.id, materials.length]);

  const activeMaterials = materials.length > 0 ? materials : fetchedMaterials;

  const handleToggleComplete = async () => {
    try {
      await enrollmentsApi.completeLesson(lesson.id);
      setIsCompleted(true);
    } catch (err) {
      console.error("Failed to mark lesson complete via API", err);
    }
  };

  const cleanCourseId = course.id;
  const lessonOrderIndex = lesson.displayIndex || String(lesson.order_index);

  // Find document/theory material if available
  const docMaterial = activeMaterials.find((m) => m.type === "markdown");
  const materialContent = docMaterial?.content || undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Switcher & Chapter Progress */}
      <LessonSwitcher
        courseId={cleanCourseId}
        courseTitle={course.title}
        currentLessonId={lesson.id}
        allLessons={allLessons.map((l, idx) => ({
          id: l.id,
          title: l.title,
          order_index: l.order_index || idx + 1,
          displayIndex: l.displayIndex,
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

        {/* Right Column: Assessment Workspace (Quiz) */}
        <div className="space-y-4">
          {/* Active Assessment Panel */}
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

          {/* Temporarily commented out manual submission & mode switcher
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
              <span>Auto-graded Quiz</span>
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
              <span>Assignment Submission</span>
            </button>
          </div>

          {assessmentTab === "quiz" ? (
            <LessonQuizCard ... />
          ) : (
            <LessonSubmissionCard lessonTitle={lesson.title} />
          )}
          */}
        </div>
      </div>
    </div>
  );
}
