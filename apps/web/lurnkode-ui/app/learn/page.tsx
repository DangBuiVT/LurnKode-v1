import { Suspense } from "react";
import { redirect } from "next/navigation";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { enrollmentsApi, coursesApi } from "@/lib/api";

async function LearnRedirect() {
  try {
    const enrollments = await enrollmentsApi.getMyEnrollments();
    if (enrollments && enrollments.length > 0) {
      const active = enrollments.find((e) => e.lastAccessedLessonId) || enrollments[0];
      if (active.lastAccessedLessonId) {
        redirect(`/learn/${active.courseId}/${active.lastAccessedLessonId}`);
      } else if (active.courseId) {
        const detail = await coursesApi.getById(active.courseId).catch(() => null);
        const firstLesson = detail?.chapters?.[0]?.lessons?.[0];
        if (firstLesson) {
          redirect(`/learn/${active.courseId}/${firstLesson.id}`);
        }
      }
    }
  } catch {
    // Backend API offline hoặc chưa đăng nhập -> dùng fallback
  }

  const lastLesson = mockDb.getLastAccessedLesson(CURRENT_USER.id);
  if (lastLesson) {
    redirect(`/learn/${lastLesson.courseId}/${lastLesson.lessonId}`);
  }

  // Fallback if user hasn't enrolled in any course
  redirect("/course/catalog");
  return null;
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Redirecting to active lesson...
        </div>
      }
    >
      <LearnRedirect />
    </Suspense>
  );
}
