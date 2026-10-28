"use client";

import { useEffect, useState } from "react";
import { LessonContentCard } from "@/components/learn/lesson-content-card";
import { LessonSubmissionCard } from "@/components/learn/lesson-submission-card";
import { LessonSwitcher } from "@/components/learn/lesson-switcher";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { Course, Lesson, User, Material } from "@/lib/db/schema";

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

        {/* Right Column: Assignment Submission */}
        <LessonSubmissionCard lessonTitle={lesson.title} />
      </div>
    </div>
  );
}
