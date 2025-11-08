"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";

type PhoneSelectorPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const MAX_PAGES_WITHOUT_ELLIPSIS = 5;
const PAGES_AROUND_CURRENT = 2;
const PAGES_BEFORE_ELLIPSIS_START = 2;
const PAGES_FROM_END = 2;

/**
 * Pagination footer component for phone selector.
 * Shows page numbers with ellipses for large page counts.
 */
export function PhoneSelectorPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PhoneSelectorPaginationProps) {
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= MAX_PAGES_WITHOUT_ELLIPSIS) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= PAGES_AROUND_CURRENT) {
        // Show pages 1-2, then ellipsis, then last
        for (let i = 2; i <= PAGES_BEFORE_ELLIPSIS_START; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 1) {
        // Show first, then ellipsis, then last 2 pages
        pages.push("ellipsis");
        for (let i = totalPages - PAGES_FROM_END; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first, ellipsis, current-1, current, current+1, ellipsis, last
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  return (
    <div className={cn("flex justify-center", className)}>
      <ButtonGroup>
        <Button
          className="h-7 px-2 text-xs"
          disabled={currentPage === 1}
          onClick={() => handlePageClick(currentPage - 1)}
          variant="outline"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <Button
                className="h-7 w-7 text-xs"
                disabled
                key={`ellipsis-${index}-${totalPages}`}
                variant="outline"
              >
                ...
              </Button>
            );
          }

          return (
            <Button
              className="h-7 w-7 text-xs"
              key={page}
              onClick={() => handlePageClick(page)}
              variant={page === currentPage ? "default" : "outline"}
            >
              {page}
            </Button>
          );
        })}

        <Button
          className="h-7 px-2 text-xs"
          disabled={currentPage === totalPages}
          onClick={() => handlePageClick(currentPage + 1)}
          variant="outline"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </ButtonGroup>
    </div>
  );
}
