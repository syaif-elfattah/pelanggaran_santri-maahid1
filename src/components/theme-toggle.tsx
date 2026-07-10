"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes butuh ini supaya server & client render sama dulu,
  // baru switch setelah tau tema yang aktif -- menghindari hydration mismatch.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-10 h-10" aria-hidden="true" />;
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      className="w-10 h-10 p-0"
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </Button>
  );
}
