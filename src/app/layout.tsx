import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Pencatatan Pelanggaran Santri | Ma'ahid Kudus",
  description: "Platform pencatatan dan pelaporan pelanggaran santri MA Ma'ahid Kudus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
