import { Suspense } from "react";
import { notFound } from "next/navigation";
import { COURSES, getCourseByIdOrSlug } from "@/data/courses";
import { CourseDetailContent } from "./course-detail-content";

export function generateStaticParams() {
  return COURSES.map((course) => ({
    courseId: course.id,
  }));
}

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

async function CourseDetailView({ params }: PageProps) {
  const { courseId } = await params;
  const course = getCourseByIdOrSlug(courseId);

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
