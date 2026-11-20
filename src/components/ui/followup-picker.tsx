"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOLLOWUP_OTHER } from "@/lib/followups";

/**
 * Tombol-tombol pilihan bentuk pembinaan (boleh pilih lebih dari satu),
 * plus "Lainnya..." yang membuka kotak isian bebas.
 * `selected` berisi label bentuk, atau FOLLOWUP_OTHER untuk "Lainnya".
 */
export function FollowupPicker({
  options,
  selected,
  onChange,
  otherText,
  onOtherTextChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  otherText: string;
  onOtherTextChange: (text: string) => void;
}) {
  const all = [...options, FOLLOWUP_OTHER];

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {all.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(value)}
              className={cn(
                "h-8 px-2.5 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors",
                active
                  ? "border-brand bg-brand-tint text-brand-text font-medium"
                  : "border-border bg-surface text-text-primary hover:border-border-strong"
              )}
            >
              {active && <Check size={12} />}
              {value === FOLLOWUP_OTHER ? "Lainnya..." : value}
            </button>
          );
        })}
      </div>
      {selected.includes(FOLLOWUP_OTHER) && (
        <input
          value={otherText}
          onChange={(e) => onOtherTextChange(e.target.value)}
          placeholder="Tulis bentuk pembinaan lainnya"
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
        />
      )}
    </div>
  );
}

/** Gabungin pilihan + isian Lainnya jadi daftar label final. */
export function resolvePickedLabels(options: string[], selected: string[], otherText: string): string[] {
  const picked = options.filter((o) => selected.includes(o));
  if (selected.includes(FOLLOWUP_OTHER) && otherText.trim()) picked.push(otherText.trim());
  return picked;
}
