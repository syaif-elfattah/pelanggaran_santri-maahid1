import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses } from "@/lib/actions/violations";
import { getFollowupTypes } from "@/lib/actions/followups";
import { getAllowedClassIds } from "@/lib/actions/reports";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/guard";
import { PembinaanClient } from "./pembinaan-client";

export default async function PembinaanPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  requireRole(session, ["admin", "wali_kelas", "guru"]);

  const [classes, followupTypes, ownClassIds] = await Promise.all([
    getClasses(false),
    getFollowupTypes(),
    getAllowedClassIds(),
  ]);

  return (
    <div>
      <Header
        title="Pembinaan"
        subtitle="Pelanggaran yang perlu dibina, dan riwayat pembinaannya"
        staffName={session?.name ?? ""}
      />
      <PembinaanClient
        classes={classes}
        followupTypes={followupTypes}
        // Wali kelas: filter kelas langsung ke kelas ampuannya, tapi tetap
        // bisa dibuka ke semua kelas (semua role boleh membina siapa pun).
        defaultClassIds={ownClassIds && ownClassIds.length > 0 ? ownClassIds : classes.map((c) => c.id)}
      />
    </div>
  );
}
