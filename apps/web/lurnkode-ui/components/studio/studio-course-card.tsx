"use client";

import Link from "next/link";
import { StudioCourse } from "@/types/studio";
import { Button, buttonVariants } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { cn } from "cn";

interface StudioCourseCardProps {
  course: StudioCourse;
  onEdit?: (courseId: string) => void;
  onViewSubmissions?: (courseId: string) => void;
}

export function StudioCourseCard({
  course,
  onEdit,
}: StudioCourseCardProps) {
  const isPublished = course.status === "Published";
  const isArchived = course.status === "Archived";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700">
      {/* Wireframe Thumbnail Placeholder (box with diagonal X) */}
      <div className="relative h-44 w-full border-b border-border bg-slate-100/70 dark:bg-slate-800/50">
        <svg
          className="size-full text-slate-300 dark:text-slate-700 transition-colors group-hover:text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Top Overlay Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {course.category ? (
            <span className="rounded-md border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground shadow-2xs backdrop-blur-xs">
              {course.category}
            </span>
          ) : <span />}

          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium shadow-2xs backdrop-blur-xs ${
              isPublished
                ? "border-emerald-300 bg-emerald-50/95 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300"
                : isArchived
                ? "border-amber-300 bg-amber-50/95 text-amber-700 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-300"
                : "border-slate-300 bg-slate-100/95 text-slate-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300"
            }`}
          >
            {course.status}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Course Title */}
        <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        {/* Wireframe Description Skeleton / Text */}
        <div className="mt-2.5 flex flex-1 flex-col gap-1.5">
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {course.description}
          </p>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="h-1.5 w-full rounded bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-1.5 w-3/4 rounded bg-slate-200/80 dark:bg-slate-800" />
          </div>
        </div>

        {/* Metadata Row: Enrolled Count & Updated date */}
        <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
          <span className="text-xs text-muted-foreground">
            {course.updatedAt ? `Updated ${course.updatedAt}` : "Recently updated"}
          </span>

          <span className="text-xs font-medium text-muted-foreground">
            Enrolled:{" "}
            <span className="font-semibold text-foreground">{course.enrolledCount}</span>
          </span>
        </div>

        {/* Action Buttons Row: Edit, Quizzes & Submissions */}
        <div className="mt-3.5 flex items-center gap-2">
          <Link
            href={`/studio/courses/${course.id}/quizzes`}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "flex-1 rounded-lg text-xs font-semibold gap-1.5"
            )}
          >
            <FileQuestion className="h-3.5 w-3.5" />
            <span>Quizzes</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(course.id)}
            className="flex-1 rounded-lg border-border text-xs font-medium hover:bg-muted"
          >
            Edit
          </Button>

          {/* Temporarily commented out Submissions button
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onViewSubmissions?.(course.id)}
            className="flex-1 rounded-lg border-border text-xs font-medium hover:bg-muted"
          >
            {isPublished ? "Submissions" : isDraft ? "Preview" : "Archived"}
          </Button>
          */}
        </div>
      </div>
    </div>
  );
}
