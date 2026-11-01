"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChapterSection } from "@/components/course/chapter-section";
import { LeaveCourseDialog } from "@/components/course/leave-course-dialog";
import { CourseDetail, Chapter, Lesson } from "@/types/course";
import { Button } from "@/components/ui/button";
import { coursesApi, enrollmentsApi, adaptBackendCourseDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PlayCircle, BookOpen, LogOut, CheckCircle2, X, Loader2 } from "lucide-react";

interface CourseDetailContentProps {
  course: CourseDetail;
}

export function CourseDetailContent({ course }: CourseDetailContentProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const isInstructorOrAdmin =
    user && (user.role === "Instructor" || user.role === "Admin");

  // Enrollment state & chapters initialized from server props
  const [isEnrolledState, setIsEnrolledState] = useState<boolean>(() => {
    return course.status !== "not_enrolled";
  });
  const isEnrolled = Boolean(isInstructorOrAdmin || isEnrolledState);

  const [progress, setProgress] = useState<number>(() => {
    return course.overallProgress || 0;
  });
  const [chapters, setChapters] = useState<Chapter[]>(course.chapters);
  const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(false);

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Active lesson
  const firstAvailableLessonId =
    chapters[0]?.lessons.find((l) => l.status !== "locked")?.id ||
    chapters[0]?.lessons[0]?.id;

  const [activeLesson, setActiveLesson] = useState<string | undefined>(
    firstAvailableLessonId
  );

  // Synchronize client-side enrollment with backend token
  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      if (!isAuthenticated || !user) {
        return;
      }

      // Instructors & Admins: Fetch live chapters unlocked for preview
      if (user.role === "Instructor" || user.role === "Admin") {
        try {
          const rawDetail = await coursesApi.getById(course.id);
          if (isMounted && rawDetail) {
            const unlockedChapters: Chapter[] = rawDetail.chapters.map((ch) => ({
              id: ch.id,
              chapterNumber: ch.orderIndex,
              title: ch.title,
              createdAt: new Date(ch.createdAt).toLocaleDateString("en-US"),
              isLocked: false,
              lessons: ch.lessons.map((l) => ({
                id: l.id,
                orderIndex: `${ch.orderIndex}.${l.orderIndex}`,
                lessonNumber: l.orderIndex,
                title: l.title,
                materials: ["markdown"],
                status: "in_progress",
                duration: "20 min",
              })),
            }));
            setChapters(unlockedChapters);
          }
        } catch {
          // Fallback to static
        }
        return;
      }

      // Learner: Check enrolled courses
      try {
        const [enrollments, rawDetail] = await Promise.all([
          enrollmentsApi.getMyEnrollments(),
          coursesApi.getById(course.id).catch(() => null),
        ]);

        if (!isMounted) return;

        const myEnrollment = enrollments.find(
          (e) => e.courseId === course.id || e.courseId === course.id.replace("c-", "")
        );

        if (myEnrollment) {
          setIsEnrolledState(true);
          if (rawDetail) {
            const adapted = adaptBackendCourseDetail(rawDetail, myEnrollment);
            setChapters(adapted.chapters);
            setProgress(adapted.overallProgress);
            const firstUnlocked =
              adapted.chapters[0]?.lessons.find((l) => l.status !== "locked")?.id ||
              adapted.chapters[0]?.lessons[0]?.id;
            setActiveLesson(firstUnlocked);
          } else {
            setProgress(0);
          }
        } else {
          setIsEnrolledState(false);
          setProgress(0);
          if (rawDetail) {
            const adapted = adaptBackendCourseDetail(rawDetail, null);
            setChapters(adapted.chapters);
          }
        }
      } catch (err) {
        console.error("Failed to query live enrollment status", err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [course.id, isAuthenticated, user]);

  const handleSelectLesson = (lesson: Lesson) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/course/${course.id}`);
      return;
    }

    if (!isEnrolled) {
      handleEnroll();
      return;
    }

    if (lesson.status === "locked" && user?.role === "Learner") {
      setNotification("This lesson is locked. Complete earlier lessons to unlock.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setActiveLesson(lesson.id);
    router.push(`/learn/${course.id}/${lesson.id}`);
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/course/${course.id}`);
      return;
    }

    if (user?.role === "Instructor") {
      setNotification("Instructors cannot enroll as learners. You can manage this course in Creator Studio.");
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      setIsLoadingEnrollment(true);
      await enrollmentsApi.enroll(course.id);
      setIsEnrolledState(true);
      setNotification("Successfully enrolled in this course! Happy learning.");

      // Refresh detail and unlock lessons
      const [enrollments, rawDetail] = await Promise.all([
        enrollmentsApi.getMyEnrollments(),
        coursesApi.getById(course.id).catch(() => null),
      ]);
      const myEnrollment = enrollments.find(
        (e) => e.courseId === course.id || e.courseId === course.id.replace("c-", "")
      );
      if (rawDetail && myEnrollment) {
        const adapted = adaptBackendCourseDetail(rawDetail, myEnrollment);
        setChapters(adapted.chapters);
        setProgress(adapted.overallProgress);
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || "";
      if (errorMsg.includes("already enrolled") || errorMsg.includes("409")) {
        setIsEnrolledState(true);
        setNotification("You are already enrolled in this course.");
      } else {
        setNotification(errorMsg || "Failed to enroll in this course. Please try again.");
      }
    } finally {
      setIsLoadingEnrollment(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleConfirmLeave = async () => {
    try {
      setIsLeaving(true);
      await enrollmentsApi.unenroll(course.id);
      setIsEnrolledState(false);
      setProgress(0);
      setChapters((prev) =>
        prev.map((ch, idx) => ({
          ...ch,
          isLocked: idx > 0,
          lessons: ch.lessons.map((l) => ({ ...l, status: "locked" })),
        }))
      );
      setIsLeaveDialogOpen(false);
      setNotification(`You have left "${course.title}". You can re-enroll at any time.`);
    } catch (err) {
      console.error("Failed to leave course via API", err);
      setNotification("Failed to leave course. Please try again.");
    } finally {
      setIsLeaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
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
                {user?.role === "Learner" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLeaveDialogOpen(true)}
                    className="gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive border-border transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Leave Course</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleResume}
                  className="gap-1.5 text-xs font-semibold shadow-xs"
                >
                  {progress >= 100 ? (
                    <BookOpen className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  <span>
                    {progress >= 100
                      ? "Review Course"
                      : progress > 0
                      ? "Continue Learning"
                      : "Start Learning"}
                  </span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isLoadingEnrollment}
                onClick={handleEnroll}
                className="gap-1.5 text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoadingEnrollment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                <span>Enroll Now</span>
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
        {chapters.map((chapter) => (
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
