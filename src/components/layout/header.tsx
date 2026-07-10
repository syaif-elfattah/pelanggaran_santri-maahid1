"use client";

import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/auth/actions";
import { useSidebar } from "./sidebar-context";

export function Header({
  title,
  subtitle,
  staffName,
}: {
  title: string;
  subtitle?: string;
  staffName: string;
}) {
  const { toggle } = useSidebar();

  return (
    <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggle}
          aria-label="Sembunyikan/tampilkan menu"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
        >
          <Menu size={19} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display font-medium text-lg text-text-primary truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-text-secondary hidden sm:inline mr-1">
          {staffName}
        </span>
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            aria-label="Keluar"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
