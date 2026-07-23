import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses } from "@/lib/actions/violations";
import { getAcademicYears, getAllowedClassIds } from "@/lib/actions/reports";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/guard";
import { LaporanClient } from "./laporan-client";

export default async function LaporanPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  requireRole(session, ["admin", "wali_kelas"]);

  const [allClasses, academicYears, allowedClassIds] = await Promise.all([
    getClasses(false),
    getAcademicYears(),
    getAllowedClassIds(),
  ]);

  // Wali kelas cuma lihat kelas ampuannya sendiri di daftar pilihan --
  // pembatasan datanya sendiri udah dikunci juga di server action, ini
  // cuma biar tampilannya nggak nawarin pilihan yang toh bakal ditolak.
  const classes = allowedClassIds ? allClasses.filter((c) => allowedClassIds.includes(c.id)) : allClasses;

  return (
    <div>
      <Header
        title="Laporan"
        subtitle={
          allowedClassIds
            ? "Data pelanggaran kelas yang kamu ampu"
            : "Filter, urutkan, dan kelola data pelanggaran"
        }
        staffName={session?.name ?? ""}
      />
      <LaporanClient classes={classes} academicYears={academicYears} lockedToOwnClass={!!allowedClassIds} />
    </div>
  );
}
