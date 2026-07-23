"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const btnClass =
    "h-9 px-3 flex items-center gap-1 rounded-lg border border-border text-xs text-text-primary hover:border-border-strong transition-colors disabled:opacity-40 disabled:hover:border-border";

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-text-secondary tabular-nums">
        {from}&ndash;{to} dari {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={btnClass}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={14} />
          Sebelumnya
        </button>
        <span className={cn("text-xs text-text-secondary tabular-nums px-1", disabled && "opacity-50")}>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className={btnClass}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
