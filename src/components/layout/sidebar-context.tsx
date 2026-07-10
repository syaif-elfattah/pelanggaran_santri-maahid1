"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarContextValue = {
  // null = belum disentuh user -> ikut default responsive (nutup di HP, kebuka di PC).
  // true/false = pilihan eksplisit user, berlaku di ukuran layar manapun.
  isOpen: boolean | null;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  function toggle() {
    setIsOpen((prev) => {
      const effectivelyOpen = prev ?? isDesktopViewport();
      return !effectivelyOpen;
    });
  }

  function close() {
    // Di PC, sidebar-nya persisten -- jangan ikut nutup tiap pindah halaman.
    if (isDesktopViewport()) return;
    setIsOpen(false);
  }

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar dipanggil di luar SidebarProvider");
  return ctx;
}
