"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

/**
 * Dropdown yang bisa diketik buat nyaring pilihan -- dipakai khusus buat
 * kelas & santri (daftarnya bisa ratusan), bukan pengganti semua <select>.
 * Dropdown pendek (status, jenis pelanggaran) tetap pakai <select> biasa.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "-- pilih --",
  disabled,
  invalid,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(option: ComboboxOption) {
    onChange(option.value);
    setIsOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  const boxClass =
    "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-left focus:outline-none disabled:opacity-50";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {isOpen ? (
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selected?.label ?? placeholder}
          className={cn(boxClass, "border-border-strong text-text-primary placeholder:text-text-muted")}
        />
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={cn(
            boxClass,
            "flex items-center justify-between gap-2 transition-colors",
            invalid ? "border-berat" : "border-border hover:border-border-strong",
            selected ? "text-text-primary" : "text-text-muted"
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown size={14} className="text-text-muted shrink-0" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-muted">Nggak ketemu</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  o.value === value ? "bg-brand-tint text-brand-text" : "text-text-primary hover:bg-surface-2"
                )}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
