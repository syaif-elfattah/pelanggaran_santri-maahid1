import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses } from "@/lib/actions/violations";
import { getAcademicYears } from "@/lib/actions/reports";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { LaporanClient } from "./laporan-client";

export default async function LaporanPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const [classes, academicYears] = await Promise.all([getClasses(false), getAcademicYears()]);

  return (
    <div>
      <Header
        title="Laporan"
        subtitle="Filter, urutkan, dan kelola data pelanggaran"
        staffName={session?.name ?? ""}
      />
      <LaporanClient classes={classes} academicYears={academicYears} />
    </div>
  );
}
