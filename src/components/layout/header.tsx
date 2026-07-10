"use client";

import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/auth/actions";

export function Header({
  title,
  subtitle,
  staffName,
}: {
  title: string;
  subtitle?: string;
  staffName: string;
}) {
  return (
    <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
      <div>
        <h1 className="font-display font-medium text-lg text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary hidden sm:inline">
          {staffName}
        </span>
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            aria-label="Keluar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
