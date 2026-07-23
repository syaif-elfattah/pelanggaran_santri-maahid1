import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getGuruAccount } from "@/lib/actions/guru-account";
import { PengaturanClient } from "./pengaturan-client";

export default async function PengaturanPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  let currentUsername = "";
  if (session) {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from("staff").select("username").eq("id", session.id).single();
    currentUsername = data?.username ?? "";
  }

  const isAdmin = session?.role === "admin";
  const guruAccount = isAdmin ? await getGuruAccount() : null;

  return (
    <div>
      <Header title="Pengaturan" staffName={session?.name ?? ""} />
      <PengaturanClient
        currentUsername={currentUsername}
        currentName={session?.name ?? ""}
        isAdmin={isAdmin}
        guruUsername={guruAccount?.username ?? null}
      />
    </div>
  );
}
