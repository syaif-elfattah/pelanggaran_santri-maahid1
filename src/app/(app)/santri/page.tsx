import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses } from "@/lib/actions/violations";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { ManajemenSantriClient } from "./manajemen-santri-client";

export default async function ManajemenSantriPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const classes = await getClasses();

  return (
    <div>
      <Header
        title="Manajemen santri"
        subtitle="Santri baru, status aktif/lulus/keluar, dan riwayat kelas"
        staffName={session?.name ?? ""}
      />
      <ManajemenSantriClient classes={classes} />
    </div>
  );
}
