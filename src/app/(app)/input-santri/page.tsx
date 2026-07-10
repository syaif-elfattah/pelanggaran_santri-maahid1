import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { ComingSoon } from "@/components/coming-soon";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export default async function Page() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  return (
    <div>
      <Header title="Input per santri" staffName={session?.name ?? ""} />
      <ComingSoon phase="Fase 2" />
    </div>
  );
}
