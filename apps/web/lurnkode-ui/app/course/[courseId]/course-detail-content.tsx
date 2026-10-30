"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChapterSection } from "@/components/course/chapter-section";
import { LeaveCourseDialog } from "@/components/course/leave-course-dialog";
import { CourseDetail, Lesson } from "@/types/course";
import { Button } from "@/components/ui/button";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { PlayCircle, BookOpen, LogOut, CheckCircle2, X } from "lucide-react";

interface CourseDetailContentProps {
  course: CourseDetail;
}

export function CourseDetailContent({ course }: CourseDetailContentProps) {
  const router = useRouter();

  // Enrollment state
  const [isEnrolled, setIsEnrolled] = useState<boolean>(() => {
    const existing = mockDb.getEnrollment(CURRENT_USER.id, course.id);
    return Boolean(existing);
  });
  const [progress, setProgress] = useState<number>(() => {
    const existing = mockDb.getEnrollment(CURRENT_USER.id, course.id);
    return existing ? course.overallProgress : 0;
  });

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Active lesson
  const firstAvailableLessonId =
    course.chapters[0]?.lessons.find((l) => l.status !== "locked")?.id ||
    course.chapters[0]?.lessons[0]?.id;

  const [activeLesson, setActiveLesson] = useState<string | undefined>(
    firstAvailableLessonId
  );

  const handleSelectLesson = (lesson: Lesson) => {
    if (!isEnrolled) {
      // Auto-enroll if clicking on first lesson or prompt
      handleEnroll();
    }
    setActiveLesson(lesson.id);
    router.push(`/learn/${course.id}/${lesson.id}`);
  };

  const handleEnroll = () => {
    mockDb.enrollCourse(CURRENT_USER.id, course.id);
    setIsEnrolled(true);
    setProgress(course.overallProgress || 0);
    setNotification("Đăng ký tham gia khóa học thành công! Chúc bạn học tốt.");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmLeave = () => {
    setIsLeaving(true);
    setTimeout(() => {
      mockDb.unenrollCourse(CURRENT_USER.id, course.id);
      setIsEnrolled(false);
      setProgress(0);
      setIsLeaveDialogOpen(false);
      setIsLeaving(false);
      setNotification(`Bạn đã rời khỏi khóa học "${course.title}". Bạn có thể đăng ký lại bất kỳ lúc nào.`);
      setTimeout(() => setNotification(null), 4000);
    }, 300);
  };

  const handleResume = () => {
    const targetLessonId = activeLesson || firstAvailableLessonId;
    if (targetLessonId) {
      router.push(`/learn/${course.id}/${targetLessonId}`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-12">
      {/* Inline Notification Banner */}
      {notification && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-medium text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Course Header Section */}
      <section className="flex flex-col gap-4">
        {/* Title & Enrollment Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {course.title}
            </h1>
            <p className="text-sm font-medium text-foreground">
              Instructor:{" "}
              <span className="text-foreground">{course.instructor}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isEnrolled ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLeaveDialogOpen(true)}
                  className="gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive border-border transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Rời khóa học</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleResume}
                  className="gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>Tiếp tục học</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleEnroll}
                className="gap-1.5 text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                <span>Đăng ký khóa học</span>
              </Button>
            )}
          </div>
        </div>

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
                {progress}%
              </span>
            </div>

            {/* Micro-progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chapters & Lessons List */}
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

      {/* Leave Course Confirmation Dialog */}
      <LeaveCourseDialog
        isOpen={isLeaveDialogOpen}
        courseTitle={course.title}
        onConfirm={handleConfirmLeave}
        onClose={() => setIsLeaveDialogOpen(false)}
        isLeaving={isLeaving}
      />
    </div>
  );
}
