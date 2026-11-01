"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
  Plus,
  SlidersHorizontal,
  RotateCcw,
  X,
  Folder,
  CheckCircle2,
  FileEdit,
  Archive,
  Filter,
} from "lucide-react";
import { StudioCourseCard } from "@/components/studio/studio-course-card";
import { CourseBuilderDialog } from "@/components/studio/course-builder-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { StudioCourse, StudioCourseStatus } from "@/types/studio";
import { Course } from "@/lib/db/schema";
import { coursesApi } from "@/lib/api";

type StatusFilter = "all" | StudioCourseStatus;
type SortOption = "updated_desc" | "enrolled_desc" | "enrolled_asc" | "title_asc" | "title_desc";

export default function StudioCoursesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Role-based authorization: Only Instructor and Admin may access Creator Studio
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "Learner") {
      router.replace("/course/catalog");
    }
  }, [user, isAuthLoading, router]);

  const [courses, setCourses] = useState<StudioCourse[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Course Builder dialog state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const refreshCourses = async () => {
    setIsCoursesLoading(true);
    setCoursesError(null);
    try {
      const backendCourses = await coursesApi.listMine();
      setCourses(backendCourses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description || "",
        status: (c.status === "published" ? "Published" : "Draft") as StudioCourseStatus,
        enrolledCount: 0,
        updatedAt: c.createdAt,
        createdAt: c.createdAt,
      })));
    } catch {
      setCourses([]);
      setCoursesError("Unable to load your courses. Check your connection and try again.");
    } finally {
      setIsCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== "Learner") {
      const timer = setTimeout(() => void refreshCourses(), 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, user]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [courses]);

  // Tab count badges
  const statusCounts = useMemo(() => {
    return {
      all: courses.length,
      Published: courses.filter((c) => c.status === "Published").length,
      Draft: courses.filter((c) => c.status === "Draft").length,
      Archived: courses.filter((c) => c.status === "Archived").length,
    };
  }, [courses]);

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // 1. Search Query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description.toLowerCase().includes(query) ||
          course.status.toLowerCase().includes(query) ||
          (course.category && course.category.toLowerCase().includes(query))
      );
    }

    // 2. Status Filter
    if (statusFilter !== "all") {
      result = result.filter((course) => course.status === statusFilter);
    }

    // 3. Category Filter
    if (categoryFilter !== "all") {
      result = result.filter((course) => course.category === categoryFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === "enrolled_desc") {
        return b.enrolledCount - a.enrolledCount;
      }
      if (sortBy === "enrolled_asc") {
        return a.enrolledCount - b.enrolledCount;
      }
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [courses, searchQuery, statusFilter, categoryFilter, sortBy]);

  // Pagination calculations
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
    setCategoryFilter("all");
    setSortBy("updated_desc");
    setCurrentPage(1);
  };

  const isFiltered =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "updated_desc";

  if (isAuthLoading || !user || user.role === "Learner") {
    return <div role="status" className="mx-auto max-w-7xl p-8 text-center text-sm text-muted-foreground">Checking instructor access…</div>;
  }

  const handleEdit = (courseId: string) => {
    setEditingCourseId(courseId);
    setIsBuilderOpen(true);
  };

  const handleViewSubmissions = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    alert(`Opening submissions for: "${course?.title}"`);
  };

  const handleCreateCourse = () => {
    setEditingCourseId(null);
    setIsBuilderOpen(true);
  };

  const handleSavedCourse = (savedCourse: Course) => {
    void refreshCourses();

    setNotification(
      `Course "${savedCourse.title}" has been successfully ${
        savedCourse.status === "published" ? "published" : "saved as draft"
      }!`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* Top Header: Title & Create Course Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Instructor Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your courses, draft curriculums, and track student enrollments.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleCreateCourse}
          className="gap-1.5 self-start sm:self-auto rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span>Create Course</span>
        </Button>
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
          <Folder className="size-3.5" />
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
          onClick={() => handleStatusChange("Published")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "Published"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>Published</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "Published"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.Published}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("Draft")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "Draft"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileEdit className="size-3.5" />
          <span>Drafts</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "Draft"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.Draft}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("Archived")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "Archived"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Archive className="size-3.5" />
          <span>Archived</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              statusFilter === "Archived"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {statusCounts.Archived}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Keyword Search */}
          <div className="relative md:col-span-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search courses by title, description, or status..."
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

          {/* Category Filter */}
          <div className="md:col-span-3">
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
                <option value="updated_desc">Sort: Recently Updated</option>
                <option value="enrolled_desc">Sort: Most Enrolled</option>
                <option value="enrolled_asc">Sort: Least Enrolled</option>
                <option value="title_asc">Sort: Title (A → Z)</option>
                <option value="title_desc">Sort: Title (Z → A)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5 text-xs">
            <span className="font-medium text-muted-foreground">Active filters:</span>

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
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => handleStatusChange("all")}
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

            {sortBy !== "updated_desc" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                Sorted: {sortBy.replace("_", " ")}
                <button
                  type="button"
                  onClick={() => handleSortChange("updated_desc")}
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

      {/* Courses Grid */}
      {isCoursesLoading ? (
        <div role="status" className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading your courses…</div>
      ) : coursesError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{coursesError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void refreshCourses()}>Retry</Button>
        </div>
      ) : paginatedCourses.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Search className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No courses found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            No courses match your active search and filter criteria. Try adjusting your query or clear the filters.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {isFiltered && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAllFilters}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                Clear all filters
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCourse}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              Create new course
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedCourses.map((course) => (
            <StudioCourseCard
              key={course.id}
              course={course}
              onEdit={handleEdit}
              onViewSubmissions={handleViewSubmissions}
            />
          ))}
        </div>
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
          pageSizeOptions={[6, 9, 12]}
          itemName="courses"
        />
      )}

      {/* Course Builder & Editor Dialog */}
      <CourseBuilderDialog
        isOpen={isBuilderOpen}
        courseId={editingCourseId}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingCourseId(null);
        }}
        onSaved={handleSavedCourse}
      />
    </div>
  );
}
