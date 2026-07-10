import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClassesManagement } from "@/lib/actions/classes";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { ManajemenKelasClient } from "./manajemen-kelas-client";

export default async function ManajemenKelasPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const classes = await getClassesManagement();

  return (
    <div>
      <Header
        title="Manajemen kelas"
        subtitle="Kelas dan wali kelas untuk tahun ajaran aktif"
        staffName={session?.name ?? ""}
      />
      <ManajemenKelasClient initialClasses={classes} />
    </div>
  );
}
