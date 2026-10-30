"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileCode, Clock, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attempt {
  id: string;
  attemptNumber: number;
  submittedAt: string;
  status: "Pending Instructor Grading" | "Graded";
  fileName?: string;
  fileSize?: string;
  textSnippet?: string;
  score?: number;
}

interface LessonSubmissionCardProps {
  lessonTitle: string;
  dueDate?: string;
}

export function LessonSubmissionCard({
  lessonTitle,
  dueDate = "23:59, 05/10/2026",
}: LessonSubmissionCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [attempts, setAttempts] = useState<Attempt[]>([
    {
      id: "att-1",
      attemptNumber: 1,
      submittedAt: "02/10/2026 14:32",
      status: "Pending Instructor Grading",
      fileName: "solution_v1.py",
      fileSize: "2.4 KB",
      textSnippet: "Implemented binary search with edge case handling for duplicates.",
    },
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile && !textAnswer.trim()) {
      alert("Vui lòng tải lên file bài làm hoặc nhập câu trả lời dạng văn bản trước khi nộp.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(
        now.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${now.getFullYear()} ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      const newAttempt: Attempt = {
        id: `att-${Date.now()}`,
        attemptNumber: attempts.length + 1,
        submittedAt: dateStr,
        status: "Pending Instructor Grading",
        fileName: selectedFile ? selectedFile.name : undefined,
        fileSize: selectedFile
          ? `${(selectedFile.size / 1024).toFixed(1)} KB`
          : undefined,
        textSnippet: textAnswer.trim() ? textAnswer.trim() : undefined,
      };

      setAttempts([newAttempt, ...attempts]);
      setSelectedFile(null);
      setTextAnswer("");
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {lessonTitle ? `${lessonTitle} - Assignment` : "Lesson Assignment (Manual Submission)"}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Submit your solution as text or file upload for the Instructor to grade.
        </p>
      </div>

      {/* Main Submission Card */}
      <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Write your search function in Python/C++ and attach your file.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">Hạn nộp (Due):</span> {dueDate}
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".py,.cpp,.c,.java,.js,.ts,.pdf,.zip"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <UploadCloud className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              Drag and drop your solution files here (e..py, .cpp, .pdf)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Supports code source files, PDF or ZIP archives (max 25MB)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs mt-1"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse File
          </Button>
        </div>

        {/* Display selected file pill */}
        {selectedFile && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileCode className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium truncate">{selectedFile.name}</span>
              <span className="text-muted-foreground shrink-0">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Text Answer */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-semibold text-foreground">
            Write your text answer
          </label>
          <textarea
            rows={4}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your solution or text answer here..."
            className="w-full rounded-md border bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedFile && !textAnswer.trim())}
            className="px-5 font-semibold text-xs sm:text-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit Attempt"}
          </Button>
        </div>
      </div>

      {/* Status & Feedback Card */}
      <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Status & Feedback</h3>
          <p className="text-xs text-muted-foreground">Previous Submissions / Attempts</p>
        </div>

        <div className="space-y-2.5">
          {attempts.map((att) => (
            <div
              key={att.id}
              className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Attempt #{att.attemptNumber}:{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {att.status}
                  </span>
                </span>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Nộp ngày {att.submittedAt}</span>
                </div>
              </div>

              {att.fileName && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span>
                    File: <span className="text-foreground font-mono">{att.fileName}</span> ({att.fileSize})
                  </span>
                </div>
              )}

              {att.textSnippet && (
                <p className="text-foreground/80 italic pl-1 border-l-2 border-muted-foreground/30 text-[11px]">
                  &ldquo;{att.textSnippet}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

