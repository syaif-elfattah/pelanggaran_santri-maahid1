"use client";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function TimeInput24({
  value,
  onChange,
  size = "md",
}: {
  value: string; // "HH:MM" atau ""
  onChange: (value: string) => void;
  size?: "sm" | "md";
}) {
  const [hour, minute] = value ? value.split(":") : ["", ""];
  const heightClass = size === "sm" ? "h-9" : "h-10";

  function update(newHour: string, newMinute: string) {
    if (!newHour && !newMinute) {
      onChange("");
    } else {
      onChange(`${newHour || "00"}:${newMinute || "00"}`);
    }
  }

  const selectClass = `${heightClass} rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong`;

  return (
    <div className="flex items-center gap-1">
      <select value={hour} onChange={(e) => update(e.target.value, minute)} className={selectClass} aria-label="Jam">
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-text-secondary">.</span>
      <select
        value={minute}
        onChange={(e) => update(hour, e.target.value)}
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
