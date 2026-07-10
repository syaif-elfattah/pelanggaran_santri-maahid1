"use client";

import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

/**
 * Input jam 24-jam manual (dua dropdown) -- native <input type="time"> nurut
 * locale browser/OS, jadi bisa kebaca format AM/PM kalau browsernya di-set
 * bahasa Inggris walau nilainya sendiri tetap 24-jam. Ini jamin tampilannya
 * selalu 00-23 apa pun setting browser.
 */
export function TimeSelect({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  function update(newHour: string, newMinute: string) {
    if (!newHour && !newMinute) {
      onChange("");
      return;
    }
    onChange(`${newHour || "00"}:${newMinute || "00"}`);
  }

  const selectClass = cn(
    "flex-1 min-w-0 rounded-lg border border-border bg-surface px-2 text-text-primary focus:outline-none focus:border-border-strong",
    size === "sm" ? "h-9 text-sm" : "h-10 text-sm"
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <select
        value={hour ?? ""}
        onChange={(e) => update(e.target.value, minute ?? "")}
        className={selectClass}
        aria-label="Jam"
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-text-secondary shrink-0">.</span>
      <select
        value={minute ?? ""}
        onChange={(e) => update(hour ?? "", e.target.value)}
        className={selectClass}
        aria-label="Menit"
      >
        <option value="">--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
