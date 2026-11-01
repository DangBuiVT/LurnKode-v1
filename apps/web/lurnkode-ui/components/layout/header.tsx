"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Sparkles,
  ChevronRight,
  GraduationCap,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/lib/auth-context";
import { coursesApi } from "@/lib/api";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [courseInfo, setCourseInfo] = useState<{ courseTitle: string; lessonTitle?: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (pathname && (pathname.startsWith("/learn/") || pathname.startsWith("/course/"))) {
      const parts = pathname.startsWith("/learn/")
        ? pathname.replace("/learn/", "").split("/").filter(Boolean)
        : pathname.replace("/course/", "").split("/").filter(Boolean);
      const courseId = parts[0];
      const lessonId = parts[1];

      if (courseId && courseId !== "catalog") {
        void coursesApi
          .getById(courseId)
          .then((detail) => {
            if (!isMounted || !detail) return;
            let lessonTitle = "Lesson";
            if (lessonId && detail.chapters) {
              for (const ch of detail.chapters) {
                const found = ch.lessons?.find(
                  (l) => l.id === lessonId || String(l.orderIndex) === lessonId
                );
                if (found) {
                  const clean = found.title
                    .replace(/^bài\s*\d+[:.\s-]*/i, "")
                    .replace(/^lesson\s*\d+[:.\s-]*/i, "")
                    .trim();
                  lessonTitle = `${ch.orderIndex}.${found.orderIndex} ${clean}`;
                  break;
                }
              }
            }
            setCourseInfo({ courseTitle: detail.title, lessonTitle });
          })
          .catch(() => {});
      } else {
        queueMicrotask(() => {
          if (isMounted) setCourseInfo(null);
        });
      }
    } else {
      queueMicrotask(() => {
        if (isMounted) setCourseInfo(null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const isInstructorOrAdmin =
    user && (user.role === "Instructor" || user.role === "Admin");
  const homeHref = isInstructorOrAdmin ? "/studio/courses" : "/course/catalog";

  // Dynamic breadcrumb generation without "Dashboard"
  const renderBreadcrumb = () => {
    // If we're inside a learning lesson page e.g. /learn/dsa/les-dsa-1-2
    if (pathname && pathname.startsWith("/learn/")) {
      const parts = pathname.replace("/learn/", "").split("/").filter(Boolean);
      const courseId = parts[0] || "dsa";

      const courseTitle = courseInfo?.courseTitle || "Course Detail";
      const lessonTitle = courseInfo?.lessonTitle || "Lesson";

      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/course/catalog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
          <Link
            href={`/course/${courseId}`}
            className="text-muted-foreground transition-colors hover:text-foreground line-clamp-1 max-w-[200px]"
          >
            {courseTitle}
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
          <span className="font-semibold text-foreground line-clamp-1 max-w-[280px]">
            {lessonTitle}
          </span>
        </nav>
      );
    }

    // If we're on /learn main page
    if (pathname === "/learn") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/course/catalog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <span className="font-semibold text-foreground">Learn</span>
        </nav>
      );
    }

    // If we're inside a course detail page e.g. /course/dsa
    if (pathname && pathname.startsWith("/course/") && pathname !== "/course/catalog") {
      const courseTitle = courseInfo?.courseTitle || "Course Detail";

      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/course/catalog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
          <span className="font-semibold text-foreground line-clamp-1 max-w-[280px] sm:max-w-md">
            {courseTitle}
          </span>
        </nav>
      );
    }

    // Default base point: "Courses"
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <span className="font-medium text-foreground">Courses</span>
      </nav>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 backdrop-blur-sm px-6">
      {/* Left section: Brand & Breadcrumbs */}
      <div className="flex items-center gap-6">
        {/* Brand Logo with Cap Icon */}
        <Link
          href={homeHref}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          <GraduationCap className="size-5.5 text-primary" />
          <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            LurnKode
          </span>
        </Link>

        {/* Dynamic Breadcrumbs */}
        {renderBreadcrumb()}
      </div>

      {/* Right section: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-4" />
          <span className="sr-only">Notifications</span>
        </button>

        {/* Creator Studio Shortcut for Instructors/Admins */}
        {isInstructorOrAdmin && (
          <Link href="/studio/courses">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-purple-300 bg-purple-50 px-3 font-semibold text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
            >
              <FolderGit2 className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Studio</span>
            </Button>
          </Link>
        )}

        {/* AI Tutor Button with Purple & Amber Accent */}
        <Button
          variant="outline"
          size="sm"
          className="group relative gap-1.5 rounded-lg border-purple-200/80 bg-purple-50/50 px-3 font-medium text-purple-700 shadow-2xs transition-all hover:border-purple-300 hover:bg-purple-100/70 hover:text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
        >
          <Sparkles className="size-3.5 text-amber-500 transition-transform group-hover:scale-110 group-hover:text-amber-400" />
          <span>AI Tutor</span>
        </Button>

        {/* User Account & Dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}
