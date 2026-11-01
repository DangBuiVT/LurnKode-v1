"use client";

import { AlertTriangle, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaveCourseDialogProps {
  isOpen: boolean;
  courseTitle: string;
  onConfirm: () => void;
  onClose: () => void;
  isLeaving?: boolean;
}

export function LeaveCourseDialog({
  isOpen,
  courseTitle,
  onConfirm,
  onClose,
  isLeaving = false,
}: LeaveCourseDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLeaving}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive dark:bg-destructive/20">
            <LogOut className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Leaving course?
            </h3>
            <p className="text-xs text-muted-foreground">
              Course:{" "}
              <span className="font-semibold text-foreground">
                {courseTitle}
              </span>
            </p>
          </div>
        </div>

        {/* Warning Details */}
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-foreground/90 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Important notice:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-0.5">
            <li>
              All progress and completion marks in this course will reset.
            </li>
            <li>
              Your access to lessons in order will return to initial state.
            </li>
            <li>You can re-enroll any time from Course Catalog.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLeaving}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isLeaving}
            className="gap-1.5 text-xs font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isLeaving ? "Leaving..." : "Confirm leave"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
