import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses, getViolationTypes } from "@/lib/actions/violations";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { InputKelasClient } from "./input-kelas-client";

export default async function InputKelasPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const [classes, violationTypes] = await Promise.all([
    getClasses(),
    getViolationTypes(),
  ]);

  return (
    <div>
      <Header
        title="Input per kelas"
        subtitle="Catat pelanggaran untuk satu kelas sekaligus"
        staffName={session?.name ?? ""}
      />
      <InputKelasClient classes={classes} violationTypes={violationTypes} />
    </div>
  );
}
