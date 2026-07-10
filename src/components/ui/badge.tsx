import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Severity = "ringan" | "sedang" | "berat" | "aktif" | "lulus" | "keluar" | "neutral";

// Nama prop "severity" ketinggalan dari waktu badge ini cuma buat tingkat
// pelanggaran -- sekarang dipakai juga buat status santri (aktif/lulus/keluar).
const severityClasses: Record<Severity, string> = {
  ringan: "bg-ringan-tint text-ringan",
  sedang: "bg-sedang-tint text-sedang",
  berat: "bg-berat-tint text-berat",
  aktif: "bg-brand-tint text-brand-text",
  lulus: "bg-surface-2 text-text-primary",
  keluar: "bg-surface-2 text-text-muted",
  neutral: "bg-surface-2 text-text-secondary",
};

export function Badge({
  severity = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { severity?: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md",
        severityClasses[severity],
        className
      )}
      {...props}
    />
  );
}
