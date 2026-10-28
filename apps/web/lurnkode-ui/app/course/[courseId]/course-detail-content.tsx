"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChapterSection } from "@/components/course/chapter-section";
import { CourseDetail, Lesson } from "@/types/course";

interface CourseDetailContentProps {
  course: CourseDetail;
}

export function CourseDetailContent({ course }: CourseDetailContentProps) {
  const router = useRouter();
  const [activeLesson, setActiveLesson] = useState<string | undefined>(
    course.chapters[0]?.lessons[1]?.id
  );

  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson.id);
    router.push(`/learn/${course.id}/${lesson.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-12">
      {/* Course Header Section */}
      <section className="flex flex-col gap-3">
        {/* Course Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {course.title}
        </h1>

        {/* Instructor */}
        <p className="text-sm font-medium text-foreground">
          Instructor:{" "}
          <span className="text-foreground">{course.instructor}</span>
        </p>

        {/* Description & Overall Progress Status row */}
        <div className="mt-1 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {course.description}
          </p>

          {/* Micro-progress bar section */}
          <div className="flex flex-col gap-1.5 shrink-0 min-w-[240px] sm:min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Overall progress status</span>
              <span className="text-muted-foreground">
                {course.overallProgress}%
              </span>
            </div>

            {/* Micro-progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-600 transition-all duration-500 dark:bg-slate-300"
                style={{ width: `${course.overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chapters & Lessons List (Without 'Group 1' or 'Group 2' labels) */}
      <section className="flex flex-col gap-5">
        {course.chapters.map((chapter) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            activeLessonId={activeLesson}
            onSelectLesson={handleSelectLesson}
            defaultExpanded={!chapter.isLocked}
          />
        ))}
      </section>
    </div>
  );
}
