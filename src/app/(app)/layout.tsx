import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // proxy.ts sudah menjaga route ini, tapi tetap dicek ulang di server
  // component sebagai lapisan kedua -- jangan pernah percaya satu gerbang saja.
  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar role={session.role} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">{children}</main>
      </div>
    </SidebarProvider>
  );
}
