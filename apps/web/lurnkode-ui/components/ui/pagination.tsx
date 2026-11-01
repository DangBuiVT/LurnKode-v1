"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "cn";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 9, 12, 24],
  itemName = "courses",
  className,
}: PaginationProps) {
  // Safe boundaries
  const validTotalPages = Math.max(1, totalPages);
  const validCurrentPage = Math.min(Math.max(1, currentPage), validTotalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (validTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= validTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const leftSide = Math.max(2, validCurrentPage - 1);
      const rightSide = Math.min(validTotalPages - 1, validCurrentPage + 1);

      if (leftSide > 2) {
        pages.push("ellipsis");
      }

      for (let i = leftSide; i <= rightSide; i++) {
        pages.push(i);
      }

      if (rightSide < validTotalPages - 1) {
        pages.push("ellipsis");
      }

      pages.push(validTotalPages);
    }

    return pages;
  }, [validCurrentPage, validTotalPages]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4 text-sm text-muted-foreground",
        className
      )}
      aria-label="Pagination Navigation"
    >
      {/* Left: Summary text */}
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">{startItem}</span> to{" "}
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
        </span>
      </div>

      {/* Right: Controls & Page size */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden text-muted-foreground md:inline">Per page:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Items per page"
                className="h-8 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs hover:border-slate-300 focus-visible:border-primary focus-visible:outline-none dark:hover:border-slate-700"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Page navigation buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={validCurrentPage <= 1}
            title="First page"
            aria-label="Go to first page"
            className="hidden sm:inline-flex"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>

          {/* Previous Page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(validCurrentPage - 1)}
            disabled={validCurrentPage <= 1}
            aria-label="Go to previous page"
            className="gap-1 px-2.5 text-xs"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          {/* Page Number Pills */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((p, idx) => {
              if (p === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex size-7 items-center justify-center text-xs text-muted-foreground select-none"
                  >
                    …
                  </span>
                );
              }

              const isActive = p === validCurrentPage;
              return (
                <Button
                  key={p}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(p)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          {/* Next Page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(validCurrentPage + 1)}
            disabled={validCurrentPage >= validTotalPages}
            aria-label="Go to next page"
            className="gap-1 px-2.5 text-xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-3.5" />
          </Button>

          {/* Last Page */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(validTotalPages)}
            disabled={validCurrentPage >= validTotalPages}
            title="Last page"
            aria-label="Go to last page"
            className="hidden sm:inline-flex"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

