"use client";

import { Course } from "@/types/course";
import { CourseCard } from "./course-card";

interface CourseGridProps {
  courses: Course[];
  onEnroll?: (courseId: string) => void;
  onResume?: (courseId: string) => void;
}

export function CourseGrid({ courses, onEnroll, onResume }: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-base font-medium text-foreground">No courses found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try searching with different keywords or clear your search query.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onEnroll={onEnroll}
          onResume={onResume}
        />
      ))}
    </div>
  );
}

