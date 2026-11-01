import { Suspense } from "react";
import { notFound } from "next/navigation";
import { enrollmentsApi, coursesApi } from "@/lib/api";
import { fetchCourseById } from "@/data/courses";
import { LearningView } from "./learning-view";
import { Course, Lesson, User, Material } from "@/lib/db/schema";

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

    let targetLesson = allLessons.find((l) => l.id === lessonId);
    if (!targetLesson && allLessons.length > 0) {
      targetLesson = allLessons[0];
    }

    if (!targetLesson) {
      notFound();
    }

    // Lấy tài liệu trực tiếp từ API access lesson hoặc backend course detail
    let materials: Material[] = [];
    try {
      const raw = await enrollmentsApi.accessLesson(targetLesson.id);
      if (raw && raw.length > 0) {
        materials = raw.map((m) => ({
          id: m.id,
          lesson_id: m.lessonId,
          title: m.title,
          type: m.type as Material["type"],
          content: m.textContent || "",
          is_rag_source: m.isRagSource,
          created_at: m.createdAt,
        }));
      }
    } catch {
      // Nếu API access gặp lỗi (ví dụ chưa hoàn thành bài trước), vẫn cố lấy từ course detail
    }

    // Nếu chưa có materials, thử lấy từ raw backend course detail
    if (materials.length === 0) {
      try {
        const rawDetail = await coursesApi.getById(courseId);
        for (const ch of rawDetail.chapters || []) {
          for (const l of ch.lessons || []) {
            if (l.id === targetLesson.id && l.materials && l.materials.length > 0) {
              materials = l.materials.map((m) => ({
                id: m.id,
                lesson_id: m.lessonId,
                title: m.title,
                type: m.type as Material["type"],
                content: m.textContent || "",
                is_rag_source: m.isRagSource,
                created_at: m.createdAt,
              }));
              break;
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    const isCompleted = lessonStatusMap.get(targetLesson.id) === "completed";

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
