import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getPromotionData } from "@/lib/actions/promotion";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { NaikKelasClient } from "./naik-kelas-client";

export default async function NaikKelasPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const data = await getPromotionData();

  return (
    <div>
      <Header
        title="Naik kelas"
        subtitle={`Promosikan santri dari tahun ajaran ${data.activeYearLabel}`}
        staffName={session?.name ?? ""}
      />
      <NaikKelasClient data={data} />
    </div>
  );
}
