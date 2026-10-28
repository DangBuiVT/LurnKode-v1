"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, Layers } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

interface LessonSwitcherProps {
  courseId: string;
  courseTitle: string;
  currentLessonId: string;
  allLessons?: Array<{ id: string; title: string; order_index: number; is_locked?: boolean }>;
}

export function LessonSwitcher({
  courseId,
  courseTitle,
  currentLessonId,
  allLessons = [
    { id: "les-dsa-1-1", title: "1.1 Array Traversal and Insertion", order_index: 1 },
    { id: "les-dsa-1-2", title: "1.2 Search on Sorted Arrays", order_index: 2 },
    { id: "les-dsa-1-3", title: "1.3 Divide and Conquer Basics", order_index: 3, is_locked: true },
  ],
}: LessonSwitcherProps) {
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm text-xs sm:text-sm">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
          {courseTitle}
        </span>
        <span className="text-muted-foreground hidden sm:inline">|</span>
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
          {allLessons.map((les) => {
            const isActive = les.id === currentLessonId;
            return (
              <Link
                key={les.id}
                href={`/learn/${courseId}/${les.id}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : les.is_locked
                    ? "text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {les.title.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {prevLesson ? (
          <Link
            href={`/learn/${courseId}/${prevLesson.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 text-xs")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Bài trước</span>
          </Link>
        ) : (
          <button
            disabled
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 text-xs opacity-50 cursor-not-allowed")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Bài trước</span>
          </button>
        )}

        <Link
          href={`/course/${courseId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1 text-xs text-muted-foreground hover:text-foreground")}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Mục lục</span>
        </Link>

        {nextLesson && !nextLesson.is_locked ? (
          <Link
            href={`/learn/${courseId}/${nextLesson.id}`}
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1 text-xs")}
          >
            <span>Bài tiếp</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            disabled
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 text-xs opacity-50 cursor-not-allowed")}
          >
            <span>Bài tiếp</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
