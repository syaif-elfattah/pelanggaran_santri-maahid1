import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
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
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-6 min-w-0">{children}</main>
    </div>
  );
}
