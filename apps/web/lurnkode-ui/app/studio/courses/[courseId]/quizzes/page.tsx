import { Suspense } from "react";
import { notFound } from "next/navigation";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { QuizManagerView } from "./quiz-manager-view";

export function generateStaticParams() {
  const courses = mockDb.getCourses();
  const params: { courseId: string }[] = [];

  courses.forEach((c) => {
    params.push({ courseId: c.id });
    params.push({ courseId: c.id.replace("c-", "") });
  });

  return params;
}

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

async function CourseQuizzesContent({ params }: PageProps) {
  const { courseId } = await params;

  const course = mockDb.getCourseById(courseId);
  if (!course) {
    notFound();
  }

  const hierarchy = mockDb.getCourseHierarchy(course.id, CURRENT_USER.id) || {
    ...course,
    instructor: {
      id: course.instructor_id,
      name: "Instructor",
      email: "instructor@lurnkode.edu",
      role: "instructor" as const,
      created_at: course.created_at,
    },
    chapters: [],
    overall_progress: 0,
  };

  return <QuizManagerView course={course} hierarchy={hierarchy} />;
}

export default function CourseQuizzesPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Đang tải không gian quản lý bài trắc nghiệm...
        </div>
      }
    >
      <CourseQuizzesContent params={params} />
    </Suspense>
  );
}

