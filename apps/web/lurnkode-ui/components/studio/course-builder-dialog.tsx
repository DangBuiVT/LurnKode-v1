"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Course, MaterialType } from "@/lib/db/schema";
import { coursesApi } from "@/lib/api";

type BuilderStep = 1 | 2 | 3 | 4;

interface MaterialFormItem {
  id?: string;
  title: string;
  type: MaterialType;
  content: string;
  is_rag_source: boolean;
}

interface LessonFormItem {
  id?: string;
  title: string;
  order_index: number;
  materials: MaterialFormItem[];
}

interface ChapterFormItem {
  id?: string;
  title: string;
  order_index: number;
  lessons: LessonFormItem[];
}

interface CourseBuilderDialogProps {
  isOpen: boolean;
  courseId?: string | null;
  onClose: () => void;
  onSaved: (course: Course) => void;
}

function CourseBuilderModalContent({
  courseId,
  onClose,
  onSaved,
}: {
  courseId?: string | null;
  onClose: () => void;
  onSaved: (course: Course) => void;
}) {
  const [step, setStep] = useState<BuilderStep>(1);

  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");

  // Step 2 & 3: Curriculum & Materials
  const [chapters, setChapters] = useState<ChapterFormItem[]>([]);
  const [baselineChapters, setBaselineChapters] = useState<ChapterFormItem[]>([]);

  // Load existing course details from Backend API if editing
  useEffect(() => {
    if (!courseId) return;
    coursesApi
      .getById(courseId)
      .then((detail) => {
        if (!detail) return;
        setTitle(detail.title);
        setDescription(detail.description || "");
        if (detail.status === "published") setStatus("published");
        if (detail.chapters && detail.chapters.length > 0) {
          const loadedChapters = detail.chapters.map((ch) => ({
              id: ch.id,
              title: ch.title,
              order_index: ch.orderIndex,
              lessons: (ch.lessons || []).map((l) => ({
                id: l.id,
                title: l.title,
                order_index: l.orderIndex,
                materials: (l.materials || []).map((m) => ({
                  id: m.id,
                  title: m.title,
                  type: m.type as MaterialType,
                  content: m.textContent || m.contentUrl || "",
                  is_rag_source: m.isRagSource,
                })),
              })),
            }));
          setChapters(loadedChapters);
          setBaselineChapters(loadedChapters);
        }
      })
      .catch(() => {});
  }, [courseId]);

  const [selectedLessonForMaterial, setSelectedLessonForMaterial] = useState<{
    chapterIdx: number;
    lessonIdx: number;
  }>({ chapterIdx: 0, lessonIdx: 0 });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chapter handlers
  const handleAddChapter = () => {
    const newIdx = chapters.length + 1;
    setChapters([
      ...chapters,
      {
        id: `ch-new-${newIdx}`,
        title: `New Chapter ${newIdx}`,
        order_index: newIdx,
        lessons: [],
      },
    ]);
  };

  const handleRemoveChapter = (chIdx: number) => {
    if (chapters.length <= 1) {
      alert("A course must contain at least 1 chapter.");
      return;
    }
    setChapters(chapters.filter((_, i) => i !== chIdx));
  };

  const handleUpdateChapterTitle = (chIdx: number, val: string) => {
    setChapters(
      chapters.map((ch, i) => (i === chIdx ? { ...ch, title: val } : ch)),
    );
  };

  // Lesson handlers
  const handleAddLesson = (chIdx: number) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          const newLesIdx = ch.lessons.length + 1;
          return {
            ...ch,
            lessons: [
              ...ch.lessons,
              {
                id: `les-new-${chIdx + 1}-${newLesIdx}`,
                title: `${ch.order_index}.${newLesIdx} New Lesson`,
                order_index: newLesIdx,
                materials: [],
              },
            ],
          };
        }
        return ch;
      }),
    );
  };

  const handleRemoveLesson = (chIdx: number, lesIdx: number) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          return {
            ...ch,
            lessons: ch.lessons.filter((_, idx) => idx !== lesIdx),
          };
        }
        return ch;
      }),
    );
  };

  const handleUpdateLessonTitle = (
    chIdx: number,
    lesIdx: number,
    val: string,
  ) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          return {
            ...ch,
            lessons: ch.lessons.map((l, j) =>
              j === lesIdx ? { ...l, title: val } : l,
            ),
          };
        }
        return ch;
      }),
    );
  };

  // Material handlers with strict generics (no any)
  const handleAddMaterial = (chIdx: number, lesIdx: number) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          return {
            ...ch,
            lessons: ch.lessons.map((l, j) => {
              if (j === lesIdx) {
                return {
                  ...l,
                  materials: [
                    ...l.materials,
                    {
                    title: "",
                      type: "markdown",
                      content: "",
                      is_rag_source: true,
                    },
                  ],
                };
              }
              return l;
            }),
          };
        }
        return ch;
      }),
    );
  };

  const handleRemoveMaterial = (
    chIdx: number,
    lesIdx: number,
    matIdx: number,
  ) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          return {
            ...ch,
            lessons: ch.lessons.map((l, j) => {
              if (j === lesIdx) {
                return {
                  ...l,
                  materials: l.materials.filter((_, mIdx) => mIdx !== matIdx),
                };
              }
              return l;
            }),
          };
        }
        return ch;
      }),
    );
  };

  const handleUpdateMaterial = <K extends keyof MaterialFormItem>(
    chIdx: number,
    lesIdx: number,
    matIdx: number,
    field: K,
    val: MaterialFormItem[K],
  ) => {
    setChapters(
      chapters.map((ch, i) => {
        if (i === chIdx) {
          return {
            ...ch,
            lessons: ch.lessons.map((l, j) => {
              if (j === lesIdx) {
                return {
                  ...l,
                  materials: l.materials.map((m, k) => {
                    if (k !== matIdx) return m;
                    const updated = { ...m, [field]: val };
                    if (field === "type" && val !== "markdown") updated.is_rag_source = false;
                    return updated;
                  }),
                };
              }
              return l;
            }),
          };
        }
        return ch;
      }),
    );
  };

  // Step Navigation
  const handlePrevStep = () => {
    if (step === 1) {
      onClose();
    } else {
      setStep((prev) => Math.max(1, prev - 1) as BuilderStep);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !title.trim()) {
      alert("Please enter a course title.");
      return;
    }
    setStep((prev) => Math.min(4, prev + 1) as BuilderStep);
  };

  // Submit / Save
  const handleSaveCourse = async (
    targetStatus?: "draft" | "published" | "archived",
  ) => {
    if (!title.trim()) {
      alert("Please enter a course title.");
      setStep(1);
      return;
    }

    const finalStatus = targetStatus || status;

    setIsSubmitting(true);

    try {
      let savedCourse;
      let savedCourseId = courseId;
      const isNewCourse = !courseId;
      if (isNewCourse) {
        const newCourse = await coursesApi.create({
          title: title.trim(),
          description: description.trim(),
        });
        if (newCourse?.id) {
          savedCourseId = newCourse.id;
          savedCourse = newCourse;
        } else {
          throw new Error("The API did not return the created course.");
        }
      }

      if (!isNewCourse) {
        savedCourse = await coursesApi.update(savedCourseId!, {
          title: title.trim(),
          description: description.trim(),
          status: finalStatus === "published" ? "published" : "draft",
        });
      }

      const currentChapterIds = new Set(chapters.map((chapter) => chapter.id).filter((id): id is string => Boolean(id && !id.startsWith("ch-new-"))));
      for (const [chIdx, chapter] of chapters.entries()) {
        const savedChapter = chapter.id && !chapter.id.startsWith("ch-new-") && !isNewCourse
          ? await coursesApi.updateChapter(chapter.id, { title: chapter.title, orderIndex: chIdx + 1 })
          : await coursesApi.createChapter(savedCourseId!, { title: chapter.title, orderIndex: chIdx + 1 });
        const currentLessonIds = new Set(chapter.lessons.map((lesson) => lesson.id).filter((id): id is string => Boolean(id && !id.startsWith("les-new-"))));
        for (const [lesIdx, lesson] of chapter.lessons.entries()) {
          const savedLesson = lesson.id && !lesson.id.startsWith("les-new-") && !isNewCourse
            ? await coursesApi.updateLesson(lesson.id, { title: lesson.title, orderIndex: lesIdx + 1 })
            : await coursesApi.createLesson(savedChapter.id, { title: lesson.title, orderIndex: lesIdx + 1 });
          const currentMaterialIds = new Set(lesson.materials.map((material) => material.id).filter((id): id is string => Boolean(id)));
          for (const material of lesson.materials) {
            const materialPayload = {
              type: material.type,
              title: material.title,
              contentUrl: material.type === "markdown" ? undefined : material.content,
              textContent: material.type === "markdown" ? material.content : undefined,
              isRagSource: material.is_rag_source,
            };
            if (material.id && !isNewCourse) await coursesApi.updateMaterial(material.id, materialPayload);
            else await coursesApi.createMaterial(savedLesson.id, materialPayload);
          }
          const baselineLesson = baselineChapters.flatMap((item) => item.lessons).find((item) => item.id === lesson.id);
          if (baselineLesson) {
            for (const material of baselineLesson.materials) {
              if (material.id && !currentMaterialIds.has(material.id)) await coursesApi.deleteMaterial(material.id);
            }
          }
        }
        if (!isNewCourse) {
          const baselineChapter = baselineChapters.find((item) => item.id === chapter.id);
          for (const oldLesson of baselineChapter?.lessons || []) {
            if (oldLesson.id && !currentLessonIds.has(oldLesson.id)) await coursesApi.deleteLesson(oldLesson.id);
          }
        }
      }
      if (!isNewCourse) {
        for (const oldChapter of baselineChapters) {
          if (oldChapter.id && !currentChapterIds.has(oldChapter.id)) await coursesApi.deleteChapter(oldChapter.id);
        }
      }
      if (finalStatus === "published" && savedCourse?.status !== "published") {
        savedCourse = await coursesApi.update(savedCourseId!, { status: "published" });
      }
      if (finalStatus === "draft" && savedCourse?.status === "published") {
        savedCourse = await coursesApi.update(savedCourseId!, { status: "draft" });
      }
      const savedCourseView: Course = {
        id: savedCourse!.id,
        instructor_id: savedCourse!.instructorId,
        title: savedCourse!.title,
        description: savedCourse!.description,
        status: savedCourse!.status,
        category: "",
        created_at: savedCourse!.createdAt,
      };
      onSaved(savedCourseView);
      onClose();
    } catch (err) {
      console.error("Failed to save course to Backend API", err);
      alert("Course could not be saved. Please check the API connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counts for summary
  const totalChapters = chapters.length;
  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const ragSourcesCount = chapters.reduce(
    (acc, ch) =>
      acc +
      ch.lessons.reduce(
        (lAcc, l) => lAcc + l.materials.filter((m) => m.is_rag_source).length,
        0,
      ),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {courseId ? "Edit Course" : "Create New Course (Course Studio)"}
              </h2>
              <p className="text-xs text-muted-foreground">
                4-Tier Content Hierarchy: Course &rarr; Chapter &rarr; Lesson
                &rarr; Material (RAG grounded)
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

        {/* Multi-step Navigation Pills */}
        <div className="flex border-b px-6 text-xs sm:text-sm font-medium bg-background overflow-x-auto scrollbar-none">
          <button
            onClick={() => setStep(1)}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              step === 1
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold">
              1
            </span>
            <span>Basic Info</span>
          </button>

          <button
            onClick={() => setStep(2)}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              step === 2
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold">
              2
            </span>
            <span>Curriculum Structure</span>
          </button>

          <button
            onClick={() => setStep(3)}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              step === 3
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold">
              3
            </span>
            <span>Materials &amp; AI Tutor</span>
          </button>

          <button
            onClick={() => setStep(4)}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              step === 4
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold">
              4
            </span>
            <span>Review &amp; Publish</span>
          </button>
        </div>

        {/* Body content per step */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Course Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advanced Object-Oriented System Design & Patterns"
                  className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Course Description &amp; Learning Outcomes
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize course syllabus, target students, prerequisites, and expected competencies..."
                  className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-foreground">
                  Course Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      status === "draft"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground block">
                      Draft
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Private draft (visible only to instructors)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      status === "published"
                        ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 dark:bg-emerald-950/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      Published
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Publicly open for learner enrollments
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("archived")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      status === "archived"
                        ? "border-amber-500 bg-amber-50/40 ring-1 ring-amber-500 dark:bg-amber-950/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                      Archived
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Archived (enrollments closed)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CURRICULUM (CHAPTERS & LESSONS) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Curriculum Structure (Chapters &amp; Lessons)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure sequential learning hierarchy (learners must
                    finish earlier lessons to unlock upcoming ones).
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddChapter}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Chapter</span>
                </Button>
              </div>

              {/* Chapters List */}
              <div className="space-y-5">
                {chapters.map((ch, chIdx) => (
                  <div
                    key={ch.id || chIdx}
                    className="rounded-xl border bg-muted/20 p-4 space-y-3.5"
                  >
                    {/* Chapter Header */}
                    <div className="flex items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {chIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) =>
                            handleUpdateChapterTitle(chIdx, e.target.value)
                          }
                          placeholder={`Chapter ${chIdx + 1} Title`}
                          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleAddLesson(chIdx)}
                          className="gap-1 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Lesson</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(chIdx)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Delete chapter"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons inside this chapter */}
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      {ch.lessons.map((les, lesIdx) => (
                        <div
                          key={les.id || lesIdx}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono text-muted-foreground font-semibold">
                              {chIdx + 1}.{lesIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={les.title}
                              onChange={(e) =>
                                handleUpdateLessonTitle(
                                  chIdx,
                                  lesIdx,
                                  e.target.value,
                                )
                              }
                              placeholder="Lesson title..."
                              className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {les.materials.length}{" "}
                              {les.materials.length === 1
                                ? "material"
                                : "materials"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLesson(chIdx, lesIdx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded"
                              title="Delete lesson"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: MATERIALS & RAG GROUNDING */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-foreground">
                  Learning Materials &amp; RAG AI Grounding
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports multiple material types (Document, Video URL, Slide).
                  Flag materials as RAG sources for AI Tutor grounded citations.
                </p>
              </div>

              {/* Lesson Picker Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {chapters.map((ch, cIdx) =>
                  ch.lessons.map((l, lIdx) => {
                    const isSelected =
                      selectedLessonForMaterial.chapterIdx === cIdx &&
                      selectedLessonForMaterial.lessonIdx === lIdx;

                    return (
                      <button
                        key={`${cIdx}-${lIdx}`}
                        type="button"
                        onClick={() =>
                          setSelectedLessonForMaterial({
                            chapterIdx: cIdx,
                            lessonIdx: lIdx,
                          })
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>
                          {ch.order_index}.{l.order_index}
                        </span>
                        <span className="truncate max-w-[120px]">
                          {l.title}
                        </span>
                      </button>
                    );
                  }),
                )}
              </div>

              {/* Active Lesson's Materials */}
              {(() => {
                const currentCh =
                  chapters[selectedLessonForMaterial.chapterIdx];
                const currentLes =
                  currentCh?.lessons[selectedLessonForMaterial.lessonIdx];

                if (!currentLes) return null;

                return (
                  <div className="rounded-xl border bg-muted/10 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Materials for: {currentLes.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Chapter: {currentCh.title}
                        </p>
                      </div>

                      <Button
                        size="xs"
                        onClick={() =>
                          handleAddMaterial(
                            selectedLessonForMaterial.chapterIdx,
                            selectedLessonForMaterial.lessonIdx,
                          )
                        }
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Material</span>
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {currentLes.materials.map((mat, mIdx) => (
                        <div
                          key={mIdx}
                          className="rounded-xl border bg-background p-4 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={mat.type}
                                onChange={(e) =>
                                  handleUpdateMaterial(
                                    selectedLessonForMaterial.chapterIdx,
                                    selectedLessonForMaterial.lessonIdx,
                                    mIdx,
                                    "type",
                                    e.target.value as MaterialType,
                                  )
                                }
                                className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none"
                              >
                                <option value="markdown">
                                  📝 Document / Markdown
                                </option>
                                <option value="video">
                                  🎥 Video Lecture URL
                                </option>
                                <option value="slide">
                                  📑 Slides / Presentation
                                </option>
                              </select>

                              <input
                                type="text"
                                value={mat.title}
                                onChange={(e) =>
                                  handleUpdateMaterial(
                                    selectedLessonForMaterial.chapterIdx,
                                    selectedLessonForMaterial.lessonIdx,
                                    mIdx,
                                    "title",
                                    e.target.value,
                                  )
                                }
                                placeholder="Material title..."
                                className="flex-1 rounded-md border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMaterial(
                                  selectedLessonForMaterial.chapterIdx,
                                  selectedLessonForMaterial.lessonIdx,
                                  mIdx,
                                )
                              }
                              className="text-muted-foreground hover:text-destructive p-1 rounded"
                              title="Delete material"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Content textarea */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              {mat.type === "video"
                                ? "Video lecture URL (YouTube, Vimeo, or direct MP4)"
                                : mat.type === "slide"
                                  ? "Presentation slides or PDF document URL"
                                  : "Course syllabus text or Markdown content"}
                            </label>
                            {mat.type === "markdown" ? (
                              <textarea
                                rows={4}
                                value={mat.content}
                                onChange={(e) =>
                                  handleUpdateMaterial(
                                    selectedLessonForMaterial.chapterIdx,
                                    selectedLessonForMaterial.lessonIdx,
                                    mIdx,
                                    "content",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter lesson text, code snippets, or Markdown content (e.g. ## Overview...)"
                                className="w-full rounded-md border bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <input
                                type="text"
                                value={mat.content}
                                onChange={(e) =>
                                  handleUpdateMaterial(
                                    selectedLessonForMaterial.chapterIdx,
                                    selectedLessonForMaterial.lessonIdx,
                                    mIdx,
                                    "content",
                                    e.target.value,
                                  )
                                }
                                placeholder="https://..."
                                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                              />
                            )}
                          </div>

                          {/* RAG Grounding Toggle */}
                          <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                            <input
                              type="checkbox"
                              id={`rag-${mIdx}`}
                              checked={mat.is_rag_source}
                              onChange={(e) =>
                                handleUpdateMaterial(
                                  selectedLessonForMaterial.chapterIdx,
                                  selectedLessonForMaterial.lessonIdx,
                                  mIdx,
                                  "is_rag_source",
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 rounded text-primary cursor-pointer"
                            />
                            <label
                              htmlFor={`rag-${mIdx}`}
                              className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              <span>RAG AI Tutor Grounding Source</span>
                            </label>
                            <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
                              Vector-indexed for course-grounded AI citations
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 4: REVIEW & PUBLISH */}
          {step === 4 && (
            <div className="space-y-6 max-w-2xl">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-foreground">
                  Summary &amp; Publication
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review course configuration and curriculum before saving or
                  publishing.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Status
                  </span>
                  <p className="font-bold text-foreground capitalize">
                    {status}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Chapters
                  </span>
                  <p className="font-bold text-foreground">
                    {totalChapters} chapters
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Total Lessons
                  </span>
                  <p className="font-bold text-foreground">
                    {totalLessons} lessons
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    RAG Sources
                  </span>
                  <p className="font-bold text-primary">
                    {ragSourcesCount} materials
                  </p>
                </div>
              </div>

              {/* Course Preview Card */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-md border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    Uncategorized
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      status === "published"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground">
                  {title || "Untitled Course"}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description || "No detailed description provided."}
                </p>

                {/* Chapters breakdown */}
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">
                    Curriculum Outline ({chapters.length} chapters):
                  </h4>
                  <div className="space-y-1 text-xs">
                    {chapters.map((ch, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-muted-foreground pl-2 border-l-2 border-primary/30"
                      >
                        <span className="font-medium text-foreground">
                          {ch.title}
                        </span>
                        <span>
                          {ch.lessons.length}{" "}
                          {ch.lessons.length === 1 ? "lesson" : "lessons"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Publish Action Box */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready to save or launch in course catalog</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Choose <strong>Save as Draft</strong> to keep drafting
                  privately, or <strong>Publish Course</strong> to make it
                  immediately available for learner enrollments in the Course
                  Catalog.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            className="text-xs gap-1"
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="h-3 w-3" />
                Back
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNextStep}
                className="text-xs gap-1"
              >
                <span>Continue</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleSaveCourse("draft")}
                  className="text-xs gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save as Draft</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleSaveCourse("published")}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Publish Course"}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourseBuilderDialog({
  isOpen,
  courseId,
  onClose,
  onSaved,
}: CourseBuilderDialogProps) {
  if (!isOpen) return null;

  return (
    <CourseBuilderModalContent
      key={courseId || "new-course"}
      courseId={courseId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
