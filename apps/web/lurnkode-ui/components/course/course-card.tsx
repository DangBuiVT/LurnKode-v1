"use client";

import Link from "next/link";
import { CheckCircle2, PlayCircle, BookOpen, LogOut } from "lucide-react";
import { Course } from "@/types/course";
import { Button } from "@/components/ui/button";

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
  onResume?: (courseId: string) => void;
  onLeave?: (courseId: string) => void;
}

export function CourseCard({ course, onEnroll, onResume, onLeave }: CourseCardProps) {
  const isEnrolled = course.status === "in_progress";
  const isCompleted = course.status === "completed";
  const courseUrl = `/course/${course.id}`;

  const handleAction = () => {
    if (isCompleted && onResume) {
      onResume(course.id);
    } else if (isEnrolled && onResume) {
      onResume(course.id);
    } else if (!isEnrolled && !isCompleted && onEnroll) {
      onEnroll(course.id);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700">
      {/* Wireframe Thumbnail Placeholder (box with diagonal X) */}
      <Link href={courseUrl} className="relative block h-44 w-full border-b border-border bg-slate-100/70 dark:bg-slate-800/50">
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

        {/* Top Badges overlay on thumbnail */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {course.category ? (
            <span className="rounded-md border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground shadow-2xs backdrop-blur-xs">
              {course.category}
            </span>
          ) : <span />}

          {isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50/95 px-2 py-0.5 text-[11px] font-medium text-emerald-700 shadow-2xs backdrop-blur-xs dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300">
              <CheckCircle2 className="size-3" />
              Completed
            </span>
          ) : isEnrolled ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50/95 px-2 py-0.5 text-[11px] font-medium text-indigo-700 shadow-2xs backdrop-blur-xs dark:border-indigo-800 dark:bg-indigo-950/90 dark:text-indigo-300">
              <PlayCircle className="size-3" />
              In Progress ({course.progress || 0}%)
            </span>
          ) : null}
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Course Title as link */}
        <Link href={courseUrl} className="focus:outline-none">
          <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
        </Link>

        {/* Wireframe Description Skeleton / Text */}
        <div className="mt-2.5 flex flex-col gap-1.5 flex-1">
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {course.description}
          </p>

          {/* Progress bar if in progress or completed */}
          {(isEnrolled || isCompleted) && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{course.progress || 0}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted ? "bg-emerald-500" : "bg-primary"
                  }`}
                  style={{ width: `${course.progress || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
          <span className="text-xs text-muted-foreground truncate max-w-[130px]">
            By <span className="font-medium text-foreground">{course.instructor}</span>
          </span>

          {isEnrolled || isCompleted ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLeave?.(course.id);
                }}
                className="h-8 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors gap-1"
                title="Leave this course"
              >
                <LogOut className="size-3.5" />
                <span>Leave</span>
              </Button>

              <Link href={courseUrl} onClick={handleAction}>
                <Button
                  type="button"
                  variant={isEnrolled ? "default" : "outline"}
                  size="sm"
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition-all ${
                    isCompleted
                      ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <BookOpen className="mr-1 size-3.5" />
                      Review
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-1 size-3.5" />
                      Resume
                    </>
                  )}
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEnroll?.(course.id);
              }}
              className="h-8 rounded-lg border-border px-3 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              Enroll Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
