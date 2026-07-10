"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  User,
  FileText,
  ArrowUpCircle,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/input-kelas", label: "Input per kelas", icon: ClipboardList },
  { href: "/input-santri", label: "Input per santri", icon: User },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/naik-kelas", label: "Naik kelas", icon: ArrowUpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  // Nutup drawer otomatis tiap pindah halaman (mobile).
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-[220px] shrink-0 bg-sidebar-bg border-r border-border p-3 flex flex-col transition-transform duration-200 ease-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 mb-6 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-brand-on" />
            </div>
            <span className="font-display font-medium text-sm text-text-primary">
              SPS Ma&apos;ahid
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Tutup menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-lg text-[13px] transition-colors",
                  active
                    ? "bg-brand-tint text-brand-text"
                    : "text-text-secondary hover:bg-surface-2"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-3 border-t border-border">
          <Link
            href="/pengaturan"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-lg text-[13px] transition-colors",
              pathname === "/pengaturan"
                ? "bg-brand-tint text-brand-text"
                : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <Settings size={16} />
            Pengaturan
          </Link>
        </div>
      </aside>
    </>
  );
}
