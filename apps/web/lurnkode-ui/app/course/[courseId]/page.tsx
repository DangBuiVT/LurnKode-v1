import { Suspense } from "react";
import { notFound } from "next/navigation";
import { fetchCourseById } from "@/data/courses";
import { CourseDetailContent } from "./course-detail-content";

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

async function CourseDetailView({ params }: PageProps) {
  const { courseId } = await params;
  const course = await fetchCourseById(courseId);

  if (!course) {
    notFound();
  }

  return <CourseDetailContent course={course} />;
}

export default function CourseDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading course curriculum...
        </div>
      }
    >
      <CourseDetailView params={params} />
    </Suspense>
  );
}
