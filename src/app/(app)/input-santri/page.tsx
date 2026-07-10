import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { getClasses, getViolationTypes } from "@/lib/actions/violations";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { InputSantriClient } from "./input-santri-client";

export default async function InputSantriPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const [classes, violationTypes] = await Promise.all([getClasses(), getViolationTypes()]);

  return (
    <div>
      <Header
        title="Input per santri"
        subtitle="Catat pelanggaran untuk satu santri"
        staffName={session?.name ?? ""}
      />
      <InputSantriClient classes={classes} violationTypes={violationTypes} />
    </div>
  );
}
