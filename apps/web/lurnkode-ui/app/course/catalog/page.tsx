"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  X,
  BookOpen,
  GraduationCap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { COURSES, fetchCourses } from "@/data/courses";
import { mockDb, CURRENT_USER } from "@/lib/db";
import { enrollmentsApi } from "@/lib/api";
import { CourseGrid } from "@/components/course/course-grid";
import { LeaveCourseDialog } from "@/components/course/leave-course-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Course, CourseStatus } from "@/types/course";

type StatusFilter = "all" | CourseStatus;
type SortOption = "newest" | "title_asc" | "title_desc" | "progress_desc";

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Leave Course Modal state
  const [leavingCourse, setLeavingCourse] = useState<Course | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load courses dynamically from M2 Backend API
  useEffect(() => {
    fetchCourses().then((data) => {
      if (data && data.length > 0) {
        setCourses(data);
      }
    });
  }, []);

  // Extract unique instructors and categories
  const instructors = useMemo(() => {
    const set = new Set(courses.map((c) => c.instructor).filter(Boolean));
    return Array.from(set).sort();
  }, [courses]);

  const categories = useMemo(() => {
    const set = new Set(
      courses.map((c) => c.category).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [courses]);

  // Base filtered courses matching keyword, instructor, and category (for accurate tab counts)
  const baseFilteredCourses = useMemo(() => {
    let result = [...courses];

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.instructor.toLowerCase().includes(query) ||
          (c.category && c.category.toLowerCase().includes(query)),
      );
    }

    if (instructorFilter !== "all") {
      result = result.filter((c) => c.instructor === instructorFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    return result;
  }, [courses, searchQuery, instructorFilter, categoryFilter]);

  // Status counts for tab badges reflecting active search & filter context
  const statusCounts = useMemo(() => {
    return {
      all: baseFilteredCourses.length,
      in_progress: baseFilteredCourses.filter((c) => c.status === "in_progress")
        .length,
      completed: baseFilteredCourses.filter((c) => c.status === "completed")
        .length,
      not_enrolled: baseFilteredCourses.filter(
        (c) => c.status === "not_enrolled",
      ).length,
    };
  }, [baseFilteredCourses]);

  // Final filtered & sorted courses (including statusFilter)
  const filteredCourses = useMemo(() => {
    let result = [...baseFilteredCourses];

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === "progress_desc") {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (a.createdAt && b.createdAt) {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    });

    return result;
  }, [baseFilteredCourses, statusFilter, sortBy]);

  // Compute pagination values
  const totalPages = Math.ceil(filteredCourses.length / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCourses = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, validCurrentPage, pageSize]);

  // Handlers with page reset
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleInstructorChange = (inst: string) => {
    setInstructorFilter(inst);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setInstructorFilter("all");
    setCategoryFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const isFiltered =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "all" ||
    instructorFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "newest";

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollmentsApi.enroll(courseId);
    } catch {
      // Fallback local db khi backend offline hoặc test
      const dbCourseId = courseId.startsWith("c-") ? courseId : `c-${courseId}`;
      mockDb.enrollCourse(CURRENT_USER.id, dbCourseId);
    }

    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, status: "in_progress" as const, progress: 0 }
          : c,
      ),
    );

    const target = courses.find((c) => c.id === courseId);
    if (target) {
      setNotification(`Đăng ký thành công khóa học "${target.title}".`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleOpenLeave = (courseId: string) => {
    const target = courses.find((c) => c.id === courseId);
    if (target) {
      setLeavingCourse(target);
    }
  };

  const handleConfirmLeave = () => {
    if (!leavingCourse) return;
    setIsLeaving(true);

    setTimeout(() => {
      mockDb.unenrollCourse(CURRENT_USER.id, leavingCourse.id);

      setCourses((prev) =>
        prev.map((c) =>
          c.id === leavingCourse.id
            ? { ...c, status: "not_enrolled" as const, progress: 0 }
            : c,
        ),
      );

      const title = leavingCourse.title;
      setLeavingCourse(null);
      setIsLeaving(false);
      setNotification(`Bạn đã rời khỏi khóa học "${title}" thành công.`);
      setTimeout(() => setNotification(null), 4000);
    }, 300);
  };

  const handleResume = (courseId: string) => {
    const target = courses.find((c) => c.id === courseId);
    if (target) {
      alert(`Resuming course: "${target.title}"`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* Page Title & Subheading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Course Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore courses, track your learning journey, and filter by status or
          topic.
        </p>
      </div>

      {/* Floating / Inline Notification Banner */}
      {notification && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-medium text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Primary Status Tabs Filter */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => handleStatusChange("all")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="size-3.5" />
          <span>All Courses</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "all"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("in_progress")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "in_progress"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Clock className="size-3.5" />
          <span>In Progress</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "in_progress"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.in_progress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("completed")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "completed"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>Completed</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "completed"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("not_enrolled")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "not_enrolled"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <GraduationCap className="size-3.5" />
          <span>Not Enrolled</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "not_enrolled"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.not_enrolled}
          </span>
        </button>
      </div>

      {/* Search & Secondary Filter Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Keyword Search */}
          <div className="relative md:col-span-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, topic, or instructor..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 text-sm text-foreground shadow-2xs transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search text"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Instructor Filter Dropdown */}
          <div className="md:col-span-2">
            <div className="relative">
              <select
                value={instructorFilter}
                onChange={(e) => handleInstructorChange(e.target.value)}
                aria-label="Filter by Instructor"
                className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-xs font-medium text-foreground shadow-2xs transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="all">All Instructors</option>
                {instructors.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                <Filter className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Category Filter Dropdown */}
          <div className="md:col-span-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Filter by Category"
                className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-xs font-medium text-foreground shadow-2xs transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                <Filter className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                aria-label="Sort courses"
                className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-xs font-medium text-foreground shadow-2xs transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="title_asc">Sort: Title (A → Z)</option>
                <option value="title_desc">Sort: Title (Z → A)</option>
                <option value="progress_desc">Sort: Highest Progress</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5 text-xs">
            <span className="font-medium text-muted-foreground">
              Active filters:
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Keyword: &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Status: {statusFilter.replace("_", " ")}
                <button
                  type="button"
                  onClick={() => handleStatusChange("all")}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {instructorFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Instructor: {instructorFilter}
                <button
                  type="button"
                  onClick={() => handleInstructorChange("all")}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {categoryFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Category: {categoryFilter}
                <button
                  type="button"
                  onClick={() => handleCategoryChange("all")}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {sortBy !== "newest" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Sorted: {sortBy.replace("_", " ")}
                <button
                  type="button"
                  onClick={() => handleSortChange("newest")}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={resetAllFilters}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              Reset all
            </Button>
          </div>
        )}
      </div>

      {/* Courses Grid or Empty State */}
      {paginatedCourses.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Search className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            No courses found
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            No courses match your active search and filter options. Try
            adjusting your search query or reset the filters.
          </p>
          {isFiltered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAllFilters}
              className="mt-4 gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <CourseGrid
          courses={paginatedCourses}
          onEnroll={handleEnroll}
          onResume={handleResume}
          onLeave={handleOpenLeave}
        />
      )}

      {/* Bottom Pagination Controls */}
      {filteredCourses.length > 0 && (
        <Pagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          totalItems={filteredCourses.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[6, 9, 12, 24]}
          itemName="courses"
        />
      )}

      {/* Leave Course Confirmation Dialog */}
      {leavingCourse && (
        <LeaveCourseDialog
          isOpen={Boolean(leavingCourse)}
          courseTitle={leavingCourse.title}
          onConfirm={handleConfirmLeave}
          onClose={() => setLeavingCourse(null)}
          isLeaving={isLeaving}
        />
      )}
    </div>
  );
}
