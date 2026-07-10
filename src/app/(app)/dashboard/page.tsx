import { cookies } from "next/headers";
import Link from "next/link";
import { ClipboardList, AlertCircle, AlertTriangle, OctagonAlert, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getDashboardStats, getRecentViolations } from "@/lib/actions/dashboard";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentViolations(5)]);

  const statCards = [
    { label: "Total bulan ini", value: stats.total, icon: ClipboardList, tint: "bg-surface-2", color: "text-text-secondary" },
    { label: "Ringan", value: stats.ringan, icon: AlertCircle, tint: "bg-ringan-tint", color: "text-ringan" },
    { label: "Sedang", value: stats.sedang, icon: AlertTriangle, tint: "bg-sedang-tint", color: "text-sedang" },
    { label: "Berat", value: stats.berat, icon: OctagonAlert, tint: "bg-berat-tint", color: "text-berat" },
  ];

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Tahun ajaran ${stats.academicYearLabel}`}
        staffName={session?.name ?? ""}
      />

      <div className="flex justify-end mb-5">
        <Link href="/input-kelas" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full sm:w-auto">
            <Plus size={15} />
            Catat pelanggaran
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map(({ label, value, icon: Icon, tint, color }) => (
          <Card key={label}>
            <div className={`w-7 h-7 rounded-lg ${tint} flex items-center justify-center mb-2.5`}>
              <Icon size={14} className={color} />
            </div>
            <div className="font-display font-medium text-xl text-text-primary">{value}</div>
            <div className="text-xs text-text-secondary mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm text-text-primary">
          Pelanggaran terbaru
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-1">
            <p className="text-sm text-text-primary">Belum ada pelanggaran tercatat.</p>
            <p className="text-xs text-text-secondary max-w-xs">
              Mulai catat lewat tombol &quot;Catat pelanggaran&quot; di atas.
            </p>
          </div>
        ) : (
          <div>
            {recent.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[11px] text-text-secondary shrink-0">
                    {initials(v.studentName)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">{v.studentName}</div>
                    <div className="text-xs text-text-secondary">{v.kelas}</div>
                  </div>
                </div>
                {v.severity && (
                  <Badge severity={v.severity} className="shrink-0">
                    {v.severity === "ringan" ? "Ringan" : v.severity === "sedang" ? "Sedang" : "Berat"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
