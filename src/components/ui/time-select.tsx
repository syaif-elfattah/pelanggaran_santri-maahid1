"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function toDigits(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":");
  return `${h ?? ""}${m ?? ""}`.replace(/\D/g, "").slice(0, 4);
}

function formatDisplay(digits: string): string {
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`;
}

/**
 * Input jam satu kolom, diketik langsung (misal ketik "1430" jadi "14.30").
 * Selalu 24-jam dan nggak mungkin ketik nilai yang nggak valid -- jam
 * di-clamp ke 00-23 begitu 2 digit pertama masuk, menit ke 00-59 begitu
 * lengkap 4 digit. Lebih cepat dari dropdown ganda buat entri berulang.
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
  const [digits, setDigits] = useState(() => toDigits(value));

  // Sinkron ulang kalau value di-reset dari luar (misal abis "tambah ke daftar").
  useEffect(() => {
    setDigits(toDigits(value));
  }, [value]);

  function handleChange(raw: string) {
    let d = raw.replace(/\D/g, "").slice(0, 4);

    if (d.length >= 2) {
      const h = Math.min(parseInt(d.slice(0, 2), 10), 23);
      d = String(h).padStart(2, "0") + d.slice(2);
    }
    if (d.length === 4) {
      const m = Math.min(parseInt(d.slice(2, 4), 10), 59);
      d = d.slice(0, 2) + String(m).padStart(2, "0");
    }

    setDigits(d);
    onChange(d.length === 4 ? `${d.slice(0, 2)}:${d.slice(2)}` : "");
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatDisplay(digits)}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="00.00"
      maxLength={5}
      aria-label="Jam, format 24 jam"
      className={cn(
        "rounded-lg border border-border bg-surface px-2 text-text-primary text-center tabular-nums focus:outline-none focus:border-border-strong",
        size === "sm" ? "h-9 text-sm w-20" : "h-10 text-sm w-24",
        className
      )}
    />
  );
}
