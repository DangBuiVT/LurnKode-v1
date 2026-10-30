"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Check,
  Flame,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockDb } from "@/lib/db/mock-db";
import { CURRENT_USER } from "@/lib/db/mock-data";
import { Quiz, QuizAttempt, QuizQuestion } from "@/lib/db/schema";

interface LessonQuizCardProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  onQuizCompleted?: (passed: boolean) => void;
}

export function LessonQuizCard(props: LessonQuizCardProps) {
  return (
    <LessonQuizCardContent
      key={`${props.courseId}-${props.lessonId}`}
      {...props}
    />
  );
}

function LessonQuizCardContent({
  courseId,
  lessonId,
  lessonTitle,
  onQuizCompleted,
}: LessonQuizCardProps) {
  const [quiz] = useState<Quiz | undefined>(() =>
    mockDb.getQuizByLessonId(courseId, lessonId)
  );
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>(() => {
    const foundQuiz = mockDb.getQuizByLessonId(courseId, lessonId);
    return foundQuiz ? mockDb.getQuizAttempts(foundQuiz.id, CURRENT_USER.id) : [];
  });
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | undefined>(
    () => {
      const foundQuiz = mockDb.getQuizByLessonId(courseId, lessonId);
      const attempts = foundQuiz
        ? mockDb.getQuizAttempts(foundQuiz.id, CURRENT_USER.id)
        : [];
      return attempts[0];
    }
  );
  const [mode, setMode] = useState<"intro" | "taking" | "review">(() => {
    const foundQuiz = mockDb.getQuizByLessonId(courseId, lessonId);
    const attempts = foundQuiz
      ? mockDb.getQuizAttempts(foundQuiz.id, CURRENT_USER.id)
      : [];
    return attempts[0] ? "review" : "intro";
  });

  // Taking state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmitQuiz = () => {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsSubmitting(true);
    setTimeout(() => {
      const attempt = mockDb.submitQuizAttempt(
        CURRENT_USER.id,
        quiz.id,
        selectedAnswers,
        timeSpent
      );

      setLatestAttempt(attempt);
      setAllAttempts((prev) => [attempt, ...prev]);
      setMode("review");
      setIsSubmitting(false);

      if (attempt.passed) {
        onQuizCompleted?.(true);
      }
    }, 400);
  };

  const submitRef = useRef(handleSubmitQuiz);
  useEffect(() => {
    submitRef.current = handleSubmitQuiz;
  });

  // Timer countdown handler
  useEffect(() => {
    if (mode === "taking" && quiz && quiz.time_limit_minutes > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            submitRef.current();
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent((prev) => prev + 1);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [mode, quiz]);

  const handleStartQuiz = () => {
    if (!quiz) return;
    setSelectedAnswers({});
    setCurrentIndex(0);
    setTimeRemaining(quiz.time_limit_minutes * 60);
    setTimeSpent(0);
    setMode("taking");
  };

  const handleSelectOption = (question: QuizQuestion, optionId: string) => {
    const currentSelected = selectedAnswers[question.id] || [];

    if (question.type === "single_choice") {
      setSelectedAnswers({
        ...selectedAnswers,
        [question.id]: [optionId],
      });
    } else {
      // multiple choice
      if (currentSelected.includes(optionId)) {
        setSelectedAnswers({
          ...selectedAnswers,
          [question.id]: currentSelected.filter((id) => id !== optionId),
        });
      } else {
        setSelectedAnswers({
          ...selectedAnswers,
          [question.id]: [...currentSelected, optionId],
        });
      }
    }
  };

  // Helper format time mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!quiz) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="text-base font-semibold text-foreground">
          Chưa có bài trắc nghiệm cho bài học này
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Giảng viên chưa cấu hình bài trắc nghiệm tự động cho bài học &quot;{lessonTitle}&quot;.
          Bạn có thể nộp bài tập tự luận hoặc chờ giảng viên cập nhật nội dung.
        </p>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).filter(
    (qId) => (selectedAnswers[qId] || []).length > 0
  ).length;
  const currentQuestion = quiz.questions[currentIndex];

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. INTRO MODE */}
      {/* ======================================================== */}
      {mode === "intro" && (
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-5">
          <div className="border-b pb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
              <Award className="h-3.5 w-3.5" />
              Chấm điểm tự động (Auto-Graded Quiz)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {quiz.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {quiz.description}
            </p>
          </div>

          {/* Quiz Metadata Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <FileCheck2 className="h-3.5 w-3.5" /> Số câu hỏi
              </span>
              <p className="text-base font-bold text-foreground">
                {quiz.questions.length} câu
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Clock className="h-3.5 w-3.5" /> Thời gian
              </span>
              <p className="text-base font-bold text-foreground">
                {quiz.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} phút` : "Không giới hạn"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Flame className="h-3.5 w-3.5" /> Điểm đạt
              </span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                &ge; {quiz.passing_score_percentage}%
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <RotateCcw className="h-3.5 w-3.5" /> Số lần làm
              </span>
              <p className="text-base font-bold text-foreground">
                {quiz.max_attempts > 0 ? `Tối đa ${quiz.max_attempts} lần` : "Không giới hạn"}
              </p>
            </div>
          </div>

          {/* Instructions Alert */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-2 text-foreground/90">
            <h4 className="font-semibold flex items-center gap-1.5 text-primary">
              <AlertCircle className="h-4 w-4" /> Hướng dẫn làm bài:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
              <li>Hệ thống sẽ tự động tính điểm ngay khi bạn nhấn nút nộp bài.</li>
              <li>Các câu trắc nghiệm nhiều đáp án yêu cầu chọn đúng và đủ tất cả đáp án đúng.</li>
              <li>Đạt từ {quiz.passing_score_percentage}% trở lên sẽ tự động đánh dấu hoàn thành bài học trên cây tiến độ khóa học.</li>
            </ul>
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleStartQuiz}
              size="lg"
              className="gap-2 px-6 font-semibold"
            >
              <span>Bắt đầu làm bài</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAKING TEST MODE */}
      {/* ======================================================== */}
      {mode === "taking" && currentQuestion && (
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-5">
          {/* Top Bar: Progress & Countdown Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Câu {currentIndex + 1} / {quiz.questions.length}
              </span>
              <h3 className="text-sm font-medium text-muted-foreground mt-0.5">
                {currentQuestion.type === "single_choice"
                  ? "Chọn 1 đáp án đúng nhất"
                  : "Chọn nhiều đáp án đúng"}
                {" "}&bull; {currentQuestion.points} điểm
              </h3>
            </div>

            {/* Countdown timer pill */}
            {quiz.time_limit_minutes > 0 && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold font-mono transition-colors ${
                  timeRemaining < 120
                    ? "bg-rose-100 text-rose-700 animate-pulse dark:bg-rose-950 dark:text-rose-300"
                    : "bg-muted text-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>

          {/* Question Navigator Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {quiz.questions.map((q, idx) => {
              const isAnswered = (selectedAnswers[q.id] || []).length > 0;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all relative ${
                    isCurrent
                      ? "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {idx + 1}
                  {isAnswered && !isCurrent && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Question Prompt */}
          <div className="rounded-lg border bg-background/50 p-4 space-y-3">
            <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-line">
              {currentQuestion.prompt}
            </p>
          </div>

          {/* Options List */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, optIdx) => {
              const isChecked = (selectedAnswers[currentQuestion.id] || []).includes(opt.id);
              const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion, opt.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3.5 text-xs sm:text-sm cursor-pointer transition-all ${
                    isChecked
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
                  }`}
                >
                  {/* Indicator Box */}
                  <div
                    className={`h-5 w-5 rounded shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 transition-colors ${
                      currentQuestion.type === "single_choice" ? "rounded-full" : "rounded-md"
                    } ${
                      isChecked
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    {isChecked ? <Check className="h-3 w-3 stroke-[3]" /> : letter}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 text-foreground leading-relaxed">
                    <span className="font-semibold mr-1.5">{letter}.</span>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation & Submit Bar */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Câu trước</span>
            </Button>

            <span className="text-xs text-muted-foreground">
              Đã làm: <strong className="text-foreground">{answeredCount}</strong> / {quiz.questions.length} câu
            </span>

            {currentIndex < quiz.questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="gap-1 text-xs"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSubmitting ? "Đang chấm điểm..." : "Nộp bài kiểm tra"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. REVIEW & AUTO-GRADED FEEDBACK MODE */}
      {/* ======================================================== */}
      {mode === "review" && latestAttempt && (
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-6">
          {/* Top Score Banner */}
          <div
            className={`rounded-xl border p-5 text-center space-y-2.5 transition-all ${
              latestAttempt.passed
                ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40"
                : "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40"
            }`}
          >
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-background shadow-xs">
              {latestAttempt.passed ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              ) : (
                <XCircle className="h-10 w-10 text-amber-600" />
              )}
            </div>

            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1 ${
                  latestAttempt.passed
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {latestAttempt.passed ? "Kết quả: ĐẠT (PASSED)" : "Kết quả: CHƯA ĐẠT"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {latestAttempt.score} / {latestAttempt.max_score} điểm ({latestAttempt.percentage}%)
              </h2>
            </div>

            <p className="text-xs sm:text-sm max-w-lg mx-auto text-muted-foreground">
              {latestAttempt.passed
                ? "🎉 Chúc mừng! Bạn đã hoàn thành xuất sắc yêu cầu bài trắc nghiệm. Hệ thống đã tự động ghi nhận và đánh dấu bài học hoàn thành trên lộ trình học!"
                : `Điểm đạt yêu cầu là ${quiz.passing_score_percentage}%. Bạn hãy đọc kỹ lại giải thích bên dưới và thử lại để hoàn thành bài học nhé.`}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartQuiz}
                className="gap-1.5 text-xs bg-background hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Làm lại bài kiểm tra</span>
              </Button>
            </div>
          </div>

          {/* Detailed Question-by-Question Breakdown */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Chi tiết bài làm &amp; Chấm điểm tự động</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({latestAttempt.feedback.filter((f) => f.is_correct).length} / {quiz.questions.length} câu đúng)
              </span>
            </h3>

            <div className="space-y-4">
              {quiz.questions.map((q, idx) => {
                const feedback = latestAttempt.feedback.find((f) => f.question_id === q.id);
                const isCorrect = feedback?.is_correct ?? false;
                const userAnswers = feedback?.user_answers ?? [];

                return (
                  <div
                    key={q.id}
                    className={`rounded-lg border p-4 space-y-3 text-xs sm:text-sm ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                        : "border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Câu {idx + 1}: Đúng</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-4 w-4" />
                            <span>Câu {idx + 1}: Chưa chính xác</span>
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {feedback?.points_earned ?? 0} / {q.points} đ
                      </span>
                    </div>

                    {/* Prompt */}
                    <p className="font-medium text-foreground whitespace-pre-line pl-6">
                      {q.prompt}
                    </p>

                    {/* Options list with correct/incorrect markers */}
                    <div className="space-y-2 pl-6 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = userAnswers.includes(opt.id);
                        const isRightAnswer = opt.is_correct;
                        const letter = String.fromCharCode(65 + optIdx);

                        let optStyle = "border-border bg-background text-foreground";
                        if (isRightAnswer) {
                          optStyle =
                            "border-emerald-500 bg-emerald-100/60 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 font-medium";
                        } else if (isChosen && !isRightAnswer) {
                          optStyle =
                            "border-rose-500 bg-rose-100/60 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 line-through";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between rounded-md border p-2.5 text-xs ${optStyle}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{letter}.</span>
                              <span>{opt.text}</span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 font-semibold text-[11px]">
                              {isRightAnswer && (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <Check className="h-3.5 w-3.5" /> Đáp án đúng
                                </span>
                              )}
                              {isChosen && (
                                <span className="text-muted-foreground ml-2 text-[10px] font-normal italic">
                                  (Bạn đã chọn)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div className="ml-6 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                        <div className="font-semibold text-primary flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5" />
                          <span>Giải thích từ giảng viên:</span>
                        </div>
                        <p className="text-muted-foreground pl-5 leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Previous Attempts History */}
          {allAttempts.length > 1 && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Lịch sử các lần làm bài ({allAttempts.length})
              </h4>
              <div className="space-y-1.5">
                {allAttempts.map((att, i) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-md border bg-muted/20 p-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      Lần {allAttempts.length - i}:{" "}
                      <span
                        className={
                          att.passed
                            ? "text-emerald-600 font-bold"
                            : "text-amber-600 font-bold"
                        }
                      >
                        {att.score}/{att.max_score} đ ({att.percentage}%) -{" "}
                        {att.passed ? "Đạt" : "Chưa đạt"}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(att.submitted_at).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

