import { Suspense } from "react";
import { notFound } from "next/navigation";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { LearningView } from "./learning-view";
import { LessonWithMaterials, Material } from "@/lib/db/schema";

export function generateStaticParams() {
  return [
    { courseId: "dsa", lessonId: "les-dsa-1-1" },
    { courseId: "dsa", lessonId: "les-dsa-1-2" },
    { courseId: "c-dsa", lessonId: "les-dsa-1-1" },
    { courseId: "c-dsa", lessonId: "les-dsa-1-2" },
    { courseId: "db", lessonId: "les-db-1-1" },
    { courseId: "c-db", lessonId: "les-db-1-1" },
  ];
}

interface PageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

async function LearnLessonContent({ params }: PageProps) {
  const { courseId, lessonId } = await params;

  const course = mockDb.getCourseById(courseId);
  if (!course) {
    notFound();
  }

  const hierarchy = mockDb.getCourseHierarchy(course.id, CURRENT_USER.id);
  if (!hierarchy) {
    notFound();
  }

  // Find the requested lesson across chapters
  let targetLesson: LessonWithMaterials | undefined;
  const allLessons: LessonWithMaterials[] = [];

  for (const ch of hierarchy.chapters) {
    for (const les of ch.lessons) {
      allLessons.push(les);
      if (les.id === lessonId) {
        targetLesson = les;
      }
    }
  }

  // Fallback to first lesson if not found
  if (!targetLesson && allLessons.length > 0) {
    targetLesson = allLessons[0];
  }

  if (!targetLesson) {
    notFound();
  }

  const instructor =
    mockDb.getUserById(course.instructor_id) || {
      id: course.instructor_id,
      name: "John Doe",
      email: "john.doe@lurnkode.edu",
      role: "instructor" as const,
      created_at: course.created_at,
    };

  // Materials for this lesson
  const materials: Material[] =
    targetLesson.materials && targetLesson.materials.length > 0
      ? targetLesson.materials
      : [
          {
            id: `mat-${targetLesson.id}-doc`,
            lesson_id: targetLesson.id,
            title: `${targetLesson.title} - Document`,
            type: "markdown",
            content: `## Introduction to Search\nGiven a sorted array of integers... write a search function with O(log N) complexity.\n\n### Concept\nThe search algorithm partitions the dataset, on search algorithms for the course that is selecting the function on bmo-search results.\n\n### Constraints\nHọc viên đọc tài liệu và thảo luận bên dưới. Chú ý các trường hợp biên như mảng rỗng, mảng chỉ có 1 phần tử hoặc mảng chứa nhiều giá trị trùng lặp.`,
            is_rag_source: true,
            created_at: targetLesson.created_at || "2026-01-01T00:00:00.000Z",
          },
        ];

  const isCompleted = mockDb.isLessonCompleted(CURRENT_USER.id, course.id, targetLesson.id);

  return (
    <LearningView
      course={course}
      lesson={targetLesson}
      instructor={instructor}
      materials={materials}
      allLessons={allLessons}
      initialIsCompleted={isCompleted}
    />
  );
}

export default function LearnLessonPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading learning workspace...
        </div>
      }
    >
      <LearnLessonContent params={params} />
    </Suspense>
  );
}
