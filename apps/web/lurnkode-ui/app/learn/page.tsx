"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enrollmentsApi, coursesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Loader2, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LearnPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [statusText, setStatusText] = useState("Loading your learning workspace...");
  const [hasNoEnrollments, setHasNoEnrollments] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveActiveLesson() {
      if (isAuthLoading) return;

      if (!isAuthenticated) {
        router.replace("/login?redirect=/learn");
        return;
      }

      if (user?.role === "Instructor" || user?.role === "Admin") {
        router.replace("/studio/courses");
        return;
      }

      setStatusText("Locating your enrolled courses...");

      try {
        const enrollments = await enrollmentsApi.getMyEnrollments();
        if (!isMounted) return;

        if (enrollments && enrollments.length > 0) {
          // 1. Pick the most recently accessed course or the first enrolled course
          const active =
            enrollments.find((e) => e.lastAccessedLessonId) || enrollments[0];

          if (active.lastAccessedLessonId) {
            router.replace(`/learn/${active.courseId}/${active.lastAccessedLessonId}`);
            return;
          }

          // 2. If no lesson accessed yet, fetch curriculum to find the first lesson
          setStatusText("Opening first available lesson...");
          const detail = await coursesApi.getById(active.courseId).catch(() => null);
          if (!isMounted) return;

          const firstLesson = detail?.chapters?.[0]?.lessons?.[0];
          if (firstLesson) {
            router.replace(`/learn/${active.courseId}/${firstLesson.id}`);
            return;
          }

          // Fallback to course detail
          router.replace(`/course/${active.courseId}`);
          return;
        }

        // 3. User has no enrollments yet
        setHasNoEnrollments(true);
      } catch (err) {
        console.error("Failed to fetch enrollments for /learn", err);
        setHasNoEnrollments(true);
      }
    }

    void resolveActiveLesson();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAuthLoading, router, user]);

  if (hasNoEnrollments) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm">
          <BookOpen className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          No Enrolled Courses Found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          You haven&apos;t enrolled in any courses yet. Browse our course catalog to find a topic and begin learning today!
        </p>
        <div className="mt-6">
          <Link href="/course/catalog">
            <Button className="gap-2 font-semibold shadow-xs">
              <GraduationCap className="size-4" />
              <span>Explore Course Catalog</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16 text-center animate-in fade-in duration-200">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{statusText}</p>
    </div>
  );
}
