"use client";

import { cx } from "@/lib/cx";
import {
  PAGE_SIZE_OPTIONS,
  isPageSize,
  type PageSize,
} from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";

type Props = {
  currentPage: number;
  totalPages: number;
  size: number;
  onPageChange: (page: number) => void;
  /** Only ever called with a size from `PAGE_SIZE_OPTIONS`. */
  onSizeChange: (size: PageSize) => void;
  /** Rendered above and below the list; only the lower one announces. */
  position: "top" | "bottom";
  /** Plural noun for the labels, e.g. `"Character"`. */
  noun: string;
};

export function ListPagination({
  currentPage,
  totalPages,
  size,
  onPageChange,
  onSizeChange,
  position,
  noun,
}: Props) {
  const handleSizeChange = (next: number) => {
    if (!isPageSize(next)) return;
    onSizeChange(next);
  };

  return (
    <nav
      className={cx(
        listSearch.pagination,
        position === "top"
          ? listSearch.paginationTop
          : listSearch.paginationBottom,
      )}
      aria-label={`${noun} list pagination, ${position}`}
    >
      <button
        type="button"
        className={listSearch.button}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ← Prev
      </button>
      <span
        className={listSearch.status}
        {...(position === "bottom" ? { "aria-live": "polite" as const } : {})}
      >
        Page {currentPage} of {totalPages}
      </span>
      <label className={listSearch.pageSize}>
        Show{" "}
        <select
          className={listSearch.pageSizeSelect}
          value={String(size)}
          onChange={(event) => handleSizeChange(Number(event.target.value))}
          aria-label={`${noun}s per page`}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option.label} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>{" "}
        per page
      </label>
      <button
        type="button"
        className={listSearch.button}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}
