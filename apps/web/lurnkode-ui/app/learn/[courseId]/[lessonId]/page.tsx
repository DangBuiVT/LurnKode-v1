import { Suspense } from "react";
import { notFound } from "next/navigation";
import { fetchCourseById } from "@/data/courses";
import { LearningView } from "./learning-view";
import { Course, Lesson, User } from "@/lib/db/schema";

interface PageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

async function LearnLessonContent({ params }: PageProps) {
  const { courseId, lessonId } = await params;

  // 1. Cố gắng lấy chi tiết khóa học từ Backend API M2
  const liveCourseDetail = await fetchCourseById(courseId);

  if (liveCourseDetail) {
    const courseCreatedAt = liveCourseDetail.createdAt || new Date().toISOString();

    const course: Course = {
      id: liveCourseDetail.id,
      instructor_id: liveCourseDetail.id,
      title: liveCourseDetail.title,
      description: liveCourseDetail.description || null,
      status: "published",
      category: liveCourseDetail.category,
      created_at: courseCreatedAt,
    };

    const instructor: User = {
      id: "instructor",
      name: liveCourseDetail.instructor,
      email: "instructor@lurnkode.edu",
      role: "instructor",
      created_at: courseCreatedAt,
    };

    // Gom danh sách toàn bộ bài học từ các chương
    const allLessons: Array<Lesson & { displayIndex: string }> = [];
    const lessonStatusMap = new Map<string, string>();

    liveCourseDetail.chapters.forEach((ch) => {
      ch.lessons.forEach((l) => {
        const displayIndex = l.orderIndex || `${ch.chapterNumber}.${l.lessonNumber}`;
        allLessons.push({
          id: l.id,
          chapter_id: ch.id,
          title: l.title,
          order_index: l.lessonNumber,
          displayIndex,
          created_at: courseCreatedAt,
        });
        lessonStatusMap.set(l.id, l.status);
      });
    });

    const targetLesson = allLessons.find((l) => l.id === lessonId);

    if (!targetLesson) {
      notFound();
    }

    const isCompleted = lessonStatusMap.get(targetLesson.id) === "completed";

    return (
      <LearningView
        course={course}
        lesson={targetLesson}
        instructor={instructor}
        materials={[]}
        allLessons={allLessons}
        initialIsCompleted={isCompleted}
      />
    );
  }

  // Khóa học không tồn tại trên hệ thống
  notFound();
}

export default function LearnLessonPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading lesson workspace and materials...
        </div>
      }
    >
      <LearnLessonContent params={params} />
    </Suspense>
  );
}
