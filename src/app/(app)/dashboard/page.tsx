import { cookies } from "next/headers";
import { ClipboardList, AlertCircle, AlertTriangle, OctagonAlert, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const STATS = [
  { label: "Total bulan ini", value: 0, icon: ClipboardList, tint: "bg-surface-2", color: "text-text-secondary" },
  { label: "Ringan", value: 0, icon: AlertCircle, tint: "bg-ringan-tint", color: "text-ringan" },
  { label: "Sedang", value: 0, icon: AlertTriangle, tint: "bg-sedang-tint", color: "text-sedang" },
  { label: "Berat", value: 0, icon: OctagonAlert, tint: "bg-berat-tint", color: "text-berat" },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Fase 1 -- fondasi siap, data pelanggaran menyusul di fase 2"
        staffName={session?.name ?? ""}
      />

      <div className="flex justify-end mb-5">
        <Button variant="primary">
          <Plus size={15} />
          Catat pelanggaran
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATS.map(({ label, value, icon: Icon, tint, color }) => (
          <Card key={label}>
            <div className={`w-7 h-7 rounded-lg ${tint} flex items-center justify-center mb-2.5`}>
              <Icon size={14} className={color} />
            </div>
            <div className="font-display font-medium text-xl text-text-primary">
              {value}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm text-text-primary">
          Pelanggaran terbaru
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-1">
          <p className="text-sm text-text-primary">Belum ada data untuk ditampilkan.</p>
          <p className="text-xs text-text-secondary max-w-xs">
            Fitur input & laporan pelanggaran menyusul di fase 2 -- dashboard ini baru fondasi (auth, tema, layout).
          </p>
          <Badge severity="neutral" className="mt-2">Fase 1</Badge>
        </div>
      </Card>
    </div>
  );
}
