import { Suspense } from "react";
import { redirect } from "next/navigation";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";

function LearnRedirect() {
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
