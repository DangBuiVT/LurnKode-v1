"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  FileQuestion,
  Layers,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Quiz, QuizQuestion, QuestionType, ChapterWithLessons } from "@/lib/db/schema";
import { mockDb } from "@/lib/db/mock-db";

interface QuizBuilderDialogProps {
  courseId: string;
  courseTitle: string;
  initialQuiz?: Quiz | null;
  chapters?: ChapterWithLessons[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (quiz: Quiz) => void;
}

export function QuizBuilderDialog({
  courseId,
  courseTitle,
  initialQuiz,
  chapters = [],
  isOpen,
  onClose,
  onSaved,
}: QuizBuilderDialogProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "questions">("settings");

  // Form state
  const [title, setTitle] = useState(initialQuiz?.title || "");
  const [description, setDescription] = useState(initialQuiz?.description || "");
  const [lessonId, setLessonId] = useState<string>(initialQuiz?.lesson_id || "");
  const [timeLimit, setTimeLimit] = useState<number>(initialQuiz?.time_limit_minutes ?? 15);
  const [passingScore, setPassingScore] = useState<number>(
    initialQuiz?.passing_score_percentage ?? 70
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(initialQuiz?.max_attempts ?? 3);

  // Questions state
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions || [
      {
        id: `q-${Date.now()}-1`,
        prompt: "Câu hỏi mẫu: Nhập nội dung câu hỏi tại đây...",
        type: "single_choice",
        points: 2.5,
        options: [
          { id: `opt-${Date.now()}-1`, text: "Lựa chọn A", is_correct: true },
          { id: `opt-${Date.now()}-2`, text: "Lựa chọn B", is_correct: false },
          { id: `opt-${Date.now()}-3`, text: "Lựa chọn C", is_correct: false },
          { id: `opt-${Date.now()}-4`, text: "Lựa chọn D", is_correct: false },
        ],
        explanation: "Giải thích đáp án đúng cho học viên sau khi hoàn thành bài.",
      },
    ]
  );

  if (!isOpen) return null;

  // Add Question
  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      prompt: `Câu hỏi ${questions.length + 1}: `,
      type: "single_choice",
      points: 2.5,
      options: [
        { id: `opt-${Date.now()}-1`, text: "Phương án 1", is_correct: true },
        { id: `opt-${Date.now()}-2`, text: "Phương án 2", is_correct: false },
        { id: `opt-${Date.now()}-3`, text: "Phương án 3", is_correct: false },
      ],
      explanation: "",
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      alert("Bài trắc nghiệm phải có ít nhất 1 câu hỏi.");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleUpdateQuestion = (
    qId: string,
    field: keyof QuizQuestion,
    val: any
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return { ...q, [field]: val };
        }
        return q;
      })
    );
  };

  // Option Handlers
  const handleAddOption = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: [
              ...q.options,
              {
                id: `opt-${Date.now()}-${q.options.length + 1}`,
                text: `Phương án ${q.options.length + 1}`,
                is_correct: false,
              },
            ],
          };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (qId: string, optId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          if (q.options.length <= 2) {
            alert("Mỗi câu hỏi phải có ít nhất 2 phương án lựa chọn.");
            return q;
          }
          return {
            ...q,
            options: q.options.filter((o) => o.id !== optId),
          };
        }
        return q;
      })
    );
  };

  const handleToggleCorrectOption = (q: QuizQuestion, optId: string) => {
    setQuestions(
      questions.map((item) => {
        if (item.id === q.id) {
          if (q.type === "single_choice") {
            return {
              ...item,
              options: item.options.map((o) => ({
                ...o,
                is_correct: o.id === optId,
              })),
            };
          } else {
            // multiple choice
            return {
              ...item,
              options: item.options.map((o) =>
                o.id === optId ? { ...o, is_correct: !o.is_correct } : o
              ),
            };
          }
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề bài trắc nghiệm.");
      setActiveTab("settings");
      return;
    }

    // Validate that every question has at least one correct option
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hasCorrect = q.options.some((o) => o.is_correct);
      if (!hasCorrect) {
        alert(
          `Câu hỏi ${i + 1} ("${q.prompt.slice(0, 30)}...") chưa được chọn đáp án đúng. Vui lòng tick chọn đáp án đúng để hệ thống tự động chấm điểm!`
        );
        setActiveTab("questions");
        return;
      }
    }

    const savedQuiz = mockDb.saveQuiz({
      id: initialQuiz?.id,
      course_id: courseId,
      lesson_id: lessonId || undefined,
      title: title.trim(),
      description: description.trim(),
      time_limit_minutes: Number(timeLimit) || 0,
      passing_score_percentage: Number(passingScore) || 70,
      max_attempts: Number(maxAttempts) || 0,
      questions,
    });

    onSaved(savedQuiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {initialQuiz ? "Chỉnh sửa bài trắc nghiệm" : "Tạo bài trắc nghiệm mới"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Khóa học: <span className="font-semibold text-foreground">{courseTitle}</span>
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

        {/* Tab Switcher */}
        <div className="flex border-b px-6 text-sm font-medium bg-background">
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            1. Cấu hình bài thi
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "questions"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>2. Ngân hàng câu hỏi &amp; Đáp án đúng</span>
            <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-bold">
              {questions.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tiêu đề bài trắc nghiệm <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Bài trắc nghiệm 1.2: Thuật toán tìm kiếm nhị phân"
                  className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Gắn vào bài học (Lesson)
                </label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Bài kiểm tra chung của khóa học (Không gắn bài học riêng) --</option>
                  {chapters.map((ch) =>
                    ch.lessons.map((les) => (
                      <option key={les.id} value={les.id}>
                        {ch.title} &rarr; 1.{les.order_index} {les.title}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Khi gắn vào bài học, học viên thi đạt sẽ tự động hoàn thành bài học đó trên lộ trình học.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mô tả / Hướng dẫn làm bài
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả phạm vi kiến thức, yêu cầu chuẩn bị hoặc hướng dẫn cho học viên..."
                  className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Thời gian làm bài (Phút)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">0 = Không giới hạn</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                    Điểm đạt yêu cầu (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">Mặc định 70%</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    Số lần làm tối đa
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">0 = Không giới hạn</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUESTIONS BUILDER */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Danh sách câu hỏi &amp; Chìa khóa chấm điểm
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Đánh dấu tích vào phương án đúng. Hệ thống tự động so khớp để chấm điểm tức thì.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddQuestion}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm câu hỏi</span>
                </Button>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="rounded-xl border bg-muted/20 p-5 space-y-4 relative group/q"
                  >
                    {/* Question Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {qIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Câu hỏi #{qIndex + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-muted-foreground">Loại câu:</label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              handleUpdateQuestion(
                                q.id,
                                "type",
                                e.target.value as QuestionType
                              )
                            }
                            className="rounded border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                          >
                            <option value="single_choice">Chọn 1 đáp án (Single Choice)</option>
                            <option value="multiple_choice">Nhiều đáp án (Multiple Choice)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-muted-foreground">Điểm:</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={q.points}
                            onChange={(e) =>
                              handleUpdateQuestion(q.id, "points", Number(e.target.value))
                            }
                            className="w-16 rounded border bg-background px-2 py-1 text-xs text-foreground text-center"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Nội dung câu hỏi
                      </label>
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, "prompt", e.target.value)
                        }
                        placeholder="Nhập câu hỏi tại đây..."
                        className="w-full rounded-lg border bg-background p-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">
                          Các phương án lựa chọn (Tick để đặt làm đáp án đúng)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(q.id)}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Thêm lựa chọn
                        </button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                opt.is_correct
                                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                                  : "border-border bg-background"
                              }`}
                            >
                              {/* Checkbox / Radio to mark correct */}
                              <input
                                type={q.type === "single_choice" ? "radio" : "checkbox"}
                                name={`correct-${q.id}`}
                                checked={opt.is_correct}
                                onChange={() => handleToggleCorrectOption(q, opt.id)}
                                className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                                title="Đánh dấu đáp án đúng"
                              />

                              <span className="text-xs font-bold text-muted-foreground shrink-0 w-4">
                                {letter}.
                              </span>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const newOptions = q.options.map((o) =>
                                    o.id === opt.id ? { ...o, text: e.target.value } : o
                                  );
                                  handleUpdateQuestion(q.id, "options", newOptions);
                                }}
                                placeholder={`Nội dung lựa chọn ${letter}`}
                                className="flex-1 bg-transparent text-xs sm:text-sm text-foreground focus:outline-none"
                              />

                              {opt.is_correct && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Đúng
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, opt.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                                title="Xóa phương án này"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Giải thích chi tiết (Hiển thị cho học viên sau khi chấm bài)
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, "explanation", e.target.value)
                        }
                        placeholder="Giải thích vì sao đáp án này đúng, liên hệ học liệu chương nào..."
                        className="w-full rounded-md border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Hủy bỏ
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "settings" ? (
              <Button
                size="sm"
                onClick={() => setActiveTab("questions")}
                className="text-xs"
              >
                Tiếp tục: Soạn câu hỏi &rarr;
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu bài trắc nghiệm</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

