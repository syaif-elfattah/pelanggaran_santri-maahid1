"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

/**
 * Dropdown checkbox buat filter kelas -- beda dari Combobox (single-select,
 * dipakai buat input/assign satu kelas). Ini khusus konteks FILTER, di mana
 * "kelas mana aja yang mau ditampilin" wajar buat lebih dari satu.
 */
export function MultiSelectFilter({
  selected,
  onChange,
  options,
  allLabel = "Semua kelas",
  noneLabel = "Pilih kelas...",
  disabled,
  className,
}: {
  selected: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  allLabel?: string;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = options.length > 0 && selected.length === options.length;
  const noneSelected = selected.length === 0;

  function toggleOne(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function toggleAll() {
    onChange(allSelected ? [] : options.map((o) => o.value));
  }

  let displayText = noneLabel;
  if (allSelected) displayText = allLabel;
  else if (selected.length === 1) displayText = options.find((o) => o.value === selected[0])?.label ?? noneLabel;
  else if (selected.length > 1) displayText = `${selected.length} kelas dipilih`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "h-10 w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-left hover:border-border-strong transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border",
          noneSelected ? "text-text-muted" : "text-text-primary"
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className="text-text-muted shrink-0" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          <button
            type="button"
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border-b border-border text-text-primary hover:bg-surface-2 transition-colors font-medium"
          >
            <span
              className={cn(
                "w-4 h-4 rounded border shrink-0 flex items-center justify-center",
                allSelected ? "bg-brand border-brand" : "border-border-strong"
              )}
            >
              {allSelected && <Check size={11} className="text-brand-on" />}
            </span>
            {allLabel}
          </button>
          {options.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleOne(o.value)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded border shrink-0 flex items-center justify-center",
                    checked ? "bg-brand border-brand" : "border-border-strong"
                  )}
                >
                  {checked && <Check size={11} className="text-brand-on" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
