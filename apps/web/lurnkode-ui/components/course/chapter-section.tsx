"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Lock,
  Video,
  FileText,
  Code,
  Presentation,
} from "lucide-react";
import { Chapter, Lesson } from "@/types/course";
import { Button } from "@/components/ui/button";

interface ChapterSectionProps {
  chapter: Chapter;
  activeLessonId?: string;
  onSelectLesson?: (lesson: Lesson) => void;
  defaultExpanded?: boolean;
}

export function ChapterSection({
  chapter,
  activeLessonId,
  onSelectLesson,
  defaultExpanded = true,
}: ChapterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const cleanChapterTitle = chapter.title
    .replace(/^chương\s*\d+[:.\s-]*/i, "")
    .replace(/^chapter\s*\d+[:.\s-]*/i, "")
    .trim();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      {/* Chapter Header / Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 sm:px-6 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="size-4.5 text-foreground transition-transform" />
          ) : (
            <ChevronRight className="size-4.5 text-muted-foreground transition-transform" />
          )}
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Chapter {chapter.chapterNumber}: {cleanChapterTitle}
          </h2>
        </div>

        {/* Chapter metadata on the right */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          {chapter.createdAt && (
            <span>Date created at · {chapter.createdAt}</span>
          )}
          {chapter.isLocked && (
            <Lock className="size-4 text-muted-foreground/80 ml-1" />
          )}
        </div>
      </button>

      {/* Collapsible Lessons List */}
      {isExpanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-5 sm:px-6">
          {chapter.lessons.map((lesson) => {
            const isCurrentActive =
              activeLessonId === lesson.id || lesson.status === "in_progress";
            const isCompleted = lesson.status === "completed";
            const isLocked = lesson.status === "locked";

            return (
              <div
                key={lesson.id}
                onClick={() => {
                  if (!isLocked) onSelectLesson?.(lesson);
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3.5 transition-all ${
                  !isLocked ? "cursor-pointer" : ""
                } ${
                  isCurrentActive
                    ? "border-slate-300 bg-slate-100/90 shadow-2xs dark:border-slate-700 dark:bg-slate-800/70"
                    : "border-border bg-card hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Left: Lesson Number, Title & Material Tags */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {lesson.orderIndex} {lesson.title.replace(/^bài\s*\d+[:.\s-]*/i, "").replace(/^lesson\s*\d+[:.\s-]*/i, "").trim()}
                    </span>
                  </div>

                  {/* Material badges: [Video], [Markdown], [Slide], [Code] */}
                  {lesson.materials && lesson.materials.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lesson.materials.map((mat) => (
                        <span
                          key={mat}
                          className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {mat === "video" && <Video className="size-3" />}
                          {mat === "markdown" && <FileText className="size-3" />}
                          {mat === "slide" && <Presentation className="size-3" />}
                          {mat === "code" && <Code className="size-3" />}
                          <span className="capitalize">[{mat}]</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Status Indicator & Action Button */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Status label: Completed (Review) / Active / Locked */}
                  {isCompleted && (
                    <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                      <Check className="size-3.5 text-foreground stroke-[2.5]" />
                      <span>Review</span>
                    </div>
                  )}

                  {isCurrentActive && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className="size-2 rounded-full bg-slate-600 dark:bg-slate-300" />
                      <span>Active</span>
                    </div>
                  )}

                  {isLocked && (
                    <div className="flex items-center justify-center p-1.5">
                      <Lock className="size-4 text-muted-foreground/70" />
                    </div>
                  )}

                  {/* Action Button: Learn / Resume */}
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLesson?.(lesson);
                      }}
                      className={`h-8 rounded-lg border-border px-4 text-xs font-medium hover:bg-muted ${
                        isCurrentActive
                          ? "border-slate-400 bg-background font-semibold text-foreground shadow-2xs hover:bg-muted"
                          : ""
                      }`}
                    >
                      {isCurrentActive ? "Resume" : "Learn"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
