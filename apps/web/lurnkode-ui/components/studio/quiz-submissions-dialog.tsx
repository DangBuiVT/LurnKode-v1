"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Quiz, QuizAttempt } from "@/lib/db/schema";
import { mockDb } from "@/lib/db/mock-db";

interface QuizSubmissionsDialogProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
}

export function QuizSubmissionsDialog({
  quiz,
  isOpen,
  onClose,
}: QuizSubmissionsDialogProps) {
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [searchLearner, setSearchLearner] = useState("");

  if (!isOpen) return null;

  const stats = mockDb.getQuizStatistics(quiz.id);
  const attempts = stats.attempts.filter(
    (att) =>
      !searchLearner.trim() ||
      (att.learner_name || "").toLowerCase().includes(searchLearner.toLowerCase()) ||
      (att.learner_email || "").toLowerCase().includes(searchLearner.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Sổ điểm &amp; Lịch sử nộp bài trắc nghiệm
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Bài kiểm tra: <span className="font-semibold text-foreground">{quiz.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b bg-background text-xs">
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Users className="h-3.5 w-3.5" /> Tổng lượt nộp
            </span>
            <p className="text-xl font-extrabold text-foreground">
              {stats.totalSubmissions} lượt
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Users className="h-3.5 w-3.5" /> Học viên tham gia
            </span>
            <p className="text-xl font-extrabold text-foreground">
              {stats.uniqueLearners} người
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Award className="h-3.5 w-3.5" /> Điểm trung bình
            </span>
            <p className="text-xl font-extrabold text-foreground">
              {stats.avgScore} đ
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tỷ lệ Đạt
            </span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.passRate}%
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b bg-background/50 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tên học viên hoặc email..."
              value={searchLearner}
              onChange={(e) => setSearchLearner(e.target.value)}
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <span className="text-xs text-muted-foreground">
            Hiển thị <strong className="text-foreground">{attempts.length}</strong> bài nộp
          </span>
        </div>

        {/* Submissions Table / Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {attempts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p>Chưa có lượt làm bài nào phù hợp.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Học viên</th>
                    <th className="px-4 py-3">Ngày nộp</th>
                    <th className="px-4 py-3">Thời gian làm</th>
                    <th className="px-4 py-3">Điểm số</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attempts.map((att) => {
                    const isExpanded = selectedAttempt?.id === att.id;
                    return (
                      <tr key={att.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {att.learner_name || "Learner"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {att.learner_email || "learner@lurnkode.edu"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(att.submitted_at).toLocaleDateString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {att.time_spent_seconds
                            ? `${Math.floor(att.time_spent_seconds / 60)}p ${
                                att.time_spent_seconds % 60
                              }s`
                            : "N/A"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-bold text-foreground">
                            {att.score} / {att.max_score}
                          </span>{" "}
                          <span className="text-muted-foreground">({att.percentage}%)</span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              att.passed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {att.passed ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Đạt
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Chưa đạt
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              setSelectedAttempt(isExpanded ? null : att)
                            }
                            className="gap-1 text-xs"
                          >
                            <span>{isExpanded ? "Đóng" : "Xem bài"}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded Detail View for Selected Attempt */}
          {selectedAttempt && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                <h4 className="text-sm font-bold text-foreground">
                  Chi tiết bài làm của:{" "}
                  <span className="text-primary">{selectedAttempt.learner_name}</span> (
                  {selectedAttempt.score}/{selectedAttempt.max_score} điểm -{" "}
                  {selectedAttempt.passed ? "Đạt" : "Chưa đạt"})
                </h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedAttempt(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-3">
                {quiz.questions.map((q, idx) => {
                  const fb = selectedAttempt.feedback.find(
                    (f) => f.question_id === q.id
                  );
                  const isCorrect = fb?.is_correct ?? false;
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border bg-background p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          Câu {idx + 1}: {q.prompt}
                        </span>
                        <span
                          className={`font-bold ${
                            isCorrect ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {fb?.points_earned ?? 0} / {q.points} đ
                        </span>
                      </div>

                      <div className="space-y-1 pl-4 pt-1">
                        {q.options.map((opt) => {
                          const isChosen = (fb?.user_answers || []).includes(opt.id);
                          const isRight = opt.is_correct;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between p-1.5 rounded ${
                                isRight
                                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-medium"
                                  : isChosen
                                  ? "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 line-through"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span>{opt.text}</span>
                              <span className="text-[10px]">
                                {isRight && "(Đáp án đúng)"}{" "}
                                {isChosen && "(Học viên chọn)"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t px-6 py-4 bg-muted/20">
          <Button size="sm" onClick={onClose} className="text-xs">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

