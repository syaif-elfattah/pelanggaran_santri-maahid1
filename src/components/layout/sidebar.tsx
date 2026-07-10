"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  User,
  FileText,
  Users,
  School,
  ArrowUpCircle,
  Settings,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import { useSidebar } from "./sidebar-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/input-kelas", label: "Input per kelas", icon: ClipboardList },
  { href: "/input-santri", label: "Input per santri", icon: User },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/santri", label: "Manajemen santri", icon: Users },
  { href: "/kelas", label: "Manajemen kelas", icon: School },
  { href: "/naik-kelas", label: "Naik kelas", icon: ArrowUpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const isFirstRender = useRef(true);

  // Nutup drawer otomatis tiap pindah halaman -- tapi di PC nggak ngefek
  // (lihat close() di sidebar-context.tsx), dan dilewatin pas render pertama
  // biar nggak sempat "berkedip" kebuka lalu langsung nutup di HP.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const mobileTranslate = isOpen === false ? "-translate-x-full" : isOpen === true ? "translate-x-0" : "-translate-x-full";
  const desktopWidth = isOpen === false ? "md:w-0" : "md:w-[220px]";

  return (
    <>
      {isOpen === true && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "shrink-0 w-[220px] transition-all duration-200 ease-out",
          "fixed md:sticky md:top-0 inset-y-0 left-0 z-50 md:h-screen overflow-hidden md:translate-x-0",
          mobileTranslate,
          desktopWidth
        )}
      >
        <div className="w-[220px] h-full bg-sidebar-bg border-r border-border p-3 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-2 mb-6 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-brand-on" />
              </div>
              <span className="font-display font-medium text-sm text-text-primary truncate">
              SPPS Ma&apos;ahid
              </span>
            </div>
            <button
              onClick={close}
              aria-label="Tutup menu"
              className="md:hidden w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
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
                    "flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors",
                    active
                      ? "bg-brand-tint text-brand-text"
                      : "text-text-secondary hover:bg-surface-2"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-3 border-t border-border flex flex-col gap-0.5">
            <Link
              href="/pengaturan"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors",
                pathname === "/pengaturan"
                  ? "bg-brand-tint text-brand-text"
                  : "text-text-secondary hover:bg-surface-2"
              )}
            >
              <Settings size={16} className="shrink-0" />
              Pengaturan
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-lg text-[13px] whitespace-nowrap text-text-secondary hover:bg-surface-2 hover:text-berat transition-colors"
              >
                <LogOut size={16} className="shrink-0" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
