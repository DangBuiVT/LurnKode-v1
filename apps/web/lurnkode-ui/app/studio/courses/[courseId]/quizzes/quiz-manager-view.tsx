"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  FileQuestion,
  Award,
  Users,
  Clock,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizBuilderDialog } from "@/components/studio/quiz-builder-dialog";
import { QuizSubmissionsDialog } from "@/components/studio/quiz-submissions-dialog";
import { LessonQuizCard } from "@/components/learn/lesson-quiz-card";
import { Course, CourseWithHierarchy, Quiz } from "@/lib/db/schema";
import { mockDb } from "@/lib/db/mock-db";

interface QuizManagerViewProps {
  course: Course;
  hierarchy: CourseWithHierarchy;
}

export function QuizManagerView({ course, hierarchy }: QuizManagerViewProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() =>
    mockDb.getQuizzes(course.id)
  );

  // Dialog states
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [submissionsQuiz, setSubmissionsQuiz] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  const refreshQuizzes = () => {
    setQuizzes([...mockDb.getQuizzes(course.id)]);
  };

  const handleOpenCreate = () => {
    setEditingQuiz(null);
    setIsBuilderOpen(true);
  };

  const handleOpenEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setIsBuilderOpen(true);
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài trắc nghiệm này cùng toàn bộ lịch sử điểm của học viên không?")) {
      mockDb.deleteQuiz(quizId);
      refreshQuizzes();
    }
  };

  // Compute course-level quiz stats
  const totalQuizzes = quizzes.length;
  let totalSubmissions = 0;
  let totalPassed = 0;
  let scoreSum = 0;

  quizzes.forEach((q) => {
    const stats = mockDb.getQuizStatistics(q.id);
    totalSubmissions += stats.totalSubmissions;
    totalPassed += stats.attempts.filter((a) => a.passed).length;
    scoreSum += stats.attempts.reduce((acc, a) => acc + a.score, 0);
  });

  const avgScore =
    totalSubmissions > 0 ? (scoreSum / totalSubmissions).toFixed(1) : "0.0";
  const overallPassRate =
    totalSubmissions > 0 ? Math.round((totalPassed / totalSubmissions) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 md:p-8">
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
        <Link href="/studio/courses" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Studio Courses</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="truncate max-w-[200px] text-foreground font-medium">
          {course.title}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Quản lý trắc nghiệm</span>
      </nav>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
            <Award className="h-3.5 w-3.5" />
            Instructor Assessment Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Trắc nghiệm &amp; Đánh giá: {course.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Thiết lập các bài trắc nghiệm chấm tự động theo bài học hoặc toàn khóa.
            Cấu hình thời gian, điểm sàn, đáp án đúng và theo dõi sổ điểm học viên theo thời gian thực.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="gap-2 font-semibold shadow-xs shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo bài trắc nghiệm mới</span>
        </Button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Tổng bài trắc nghiệm</span>
            <FileQuestion className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalQuizzes}</p>
          <p className="text-[11px] text-muted-foreground">Trong toàn bộ khóa học</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Lượt nộp bài</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalSubmissions}</p>
          <p className="text-[11px] text-muted-foreground">Tổng số lượt làm bài của học viên</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Điểm trung bình</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{avgScore} đ</p>
          <p className="text-[11px] text-muted-foreground">Thang điểm 10.0</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Tỷ lệ đạt yêu cầu</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {overallPassRate}%
          </p>
          <p className="text-[11px] text-muted-foreground">Đạt điểm &ge; ngưỡng quy định</p>
        </div>
      </div>

      {/* Quizzes List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>Danh sách bài kiểm tra trắc nghiệm</span>
            <span className="text-xs font-normal text-muted-foreground">({quizzes.length})</span>
          </h2>
        </div>

        {quizzes.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileQuestion className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Khóa học này chưa có bài trắc nghiệm nào
            </h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Hãy tạo bài kiểm tra trắc nghiệm đầu tiên để kiểm tra kiến thức học viên và bật cơ chế chấm điểm tự động.
            </p>
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              <span>Tạo bài trắc nghiệm ngay</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => {
              const stats = mockDb.getQuizStatistics(quiz.id);

              // Find associated lesson title
              let lessonTitle = "Chung cho cả khóa học";
              if (quiz.lesson_id) {
                for (const ch of hierarchy.chapters) {
                  const les = ch.lessons.find((l) => l.id === quiz.lesson_id);
                  if (les) {
                    lessonTitle = `${ch.title} &rarr; 1.${les.order_index} ${les.title}`;
                    break;
                  }
                }
              }

              return (
                <div
                  key={quiz.id}
                  className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground truncate max-w-[260px]">
                        <BookOpen className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate" dangerouslySetInnerHTML={{ __html: lessonTitle }} />
                      </span>

                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Đạt: &ge;{quiz.passing_score_percentage}%
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-foreground line-clamp-1">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {quiz.description || "Chưa có mô tả chi tiết."}
                      </p>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FileQuestion className="h-3.5 w-3.5 text-primary" />
                        <strong className="text-foreground">{quiz.questions.length}</strong> câu hỏi
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {quiz.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} phút` : "Không giới hạn"}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        <strong className="text-foreground">{stats.totalSubmissions}</strong> bài nộp
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-border/80 pt-3.5 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenEdit(quiz)}
                        className="gap-1 text-xs"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Chỉnh sửa</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setSubmissionsQuiz(quiz)}
                        className="gap-1 text-xs"
                      >
                        <Users className="h-3 w-3" />
                        <span>Sổ điểm ({stats.totalSubmissions})</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setPreviewQuiz(quiz)}
                        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                        title="Xem trước dạng học viên"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Xem thử</span>
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Xóa bài trắc nghiệm này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <QuizBuilderDialog
        courseId={course.id}
        courseTitle={course.title}
        initialQuiz={editingQuiz}
        chapters={hierarchy.chapters}
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingQuiz(null);
        }}
        onSaved={() => {
          refreshQuizzes();
        }}
      />

      {submissionsQuiz && (
        <QuizSubmissionsDialog
          quiz={submissionsQuiz}
          isOpen={Boolean(submissionsQuiz)}
          onClose={() => setSubmissionsQuiz(null)}
        />
      )}

      {/* Preview As Learner Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b px-6 py-3.5 bg-muted/40">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Chế độ xem trước của Học viên (Learner Preview)</span>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <LessonQuizCard
                courseId={course.id}
                lessonId={previewQuiz.lesson_id || "preview"}
                lessonTitle={previewQuiz.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

