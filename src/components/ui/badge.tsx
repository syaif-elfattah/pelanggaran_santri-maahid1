import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Severity = "ringan" | "sedang" | "berat" | "neutral";

const severityClasses: Record<Severity, string> = {
  ringan: "bg-ringan-tint text-ringan",
  sedang: "bg-sedang-tint text-sedang",
  berat: "bg-berat-tint text-berat",
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
