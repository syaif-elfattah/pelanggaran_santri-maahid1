"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { executePromotion, type PromotionData } from "@/lib/actions/promotion";

const LULUS = "__LULUS__";

type RowState = { action: "naik" | "lulus"; toClassId: string };

export function NaikKelasClient({ data }: { data: PromotionData }) {
  const [newYearLabel, setNewYearLabel] = useState(data.suggestedNewYearLabel);
  const [startDate, setStartDate] = useState(data.suggestedStartDate);
  const [endDate, setEndDate] = useState(data.suggestedEndDate);

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      data.classRoster.map((c) => [
        c.id,
        c.isMaxGrade
          ? { action: "lulus" as const, toClassId: "" }
          : { action: "naik" as const, toClassId: c.suggestedToClassId ?? "" },
      ])
    )
  );

  const [confirmed, setConfirmed] = useState(false);
  const [copyHomeroom, setCopyHomeroom] = useState(true);
  const [isRunning, startRunning] = useTransition();
  const [result, setResult] = useState<{ status: "idle" } | { status: "success" } | { status: "error"; message: string }>({
    status: "idle",
  });

  function updateRow(classId: string, value: string) {
    if (value === LULUS) {
      setRows((prev) => ({ ...prev, [classId]: { action: "lulus", toClassId: "" } }));
    } else {
      setRows((prev) => ({ ...prev, [classId]: { action: "naik", toClassId: value } }));
    }
  }

  const incompleteRows = data.classRoster.filter((c) => {
    const r = rows[c.id];
    return r.action === "naik" && !r.toClassId;
  });

  const canSubmit = incompleteRows.length === 0 && confirmed && newYearLabel.trim().length > 0;

  function handleExecute() {
    if (!canSubmit) return;
    startRunning(async () => {
      const mappings = data.classRoster.map((c) => ({
        fromClassId: c.id,
        action: rows[c.id].action,
        toClassId: rows[c.id].action === "lulus" ? null : rows[c.id].toClassId,
      }));

      const res = await executePromotion(newYearLabel.trim(), startDate, endDate, mappings, copyHomeroom);
      if (res.success) {
        setResult({ status: "success" });
      } else {
        setResult({ status: "error", message: res.error });
      }
    });
  }

  if (result.status === "success") {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <CheckCircle2 size={24} className="text-brand-text mb-1" />
        <p className="text-sm text-text-primary">
          Naik kelas ke tahun ajaran {newYearLabel} berhasil diproses.
        </p>
        <p className="text-xs text-text-secondary max-w-sm">
          Muat ulang halaman ini buat mastiin dashboard & laporan udah ngikut tahun ajaran baru.
        </p>
      </Card>
    );
  }

  if (data.classRoster.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
        <p className="text-sm text-text-primary">Tidak ada kelas dengan santri aktif buat diproses.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 border-l-2 border-l-sedang">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-sedang shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary">
            Proses ini memindahkan semua santri aktif sekaligus ke tahun ajaran baru dan
            mengubah tahun ajaran aktif sistem. Kalau ada 1-2 santri yang perlu pindah beda arah
            dari kelasnya, benerin lewat <span className="text-text-primary">Manajemen santri</span> setelah
            proses ini selesai -- bukan di sini.
          </p>
        </div>
      </Card>

      <Card className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Tahun ajaran baru</label>
          <input
            value={newYearLabel}
            onChange={(e) => setNewYearLabel(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Selesai</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-secondary">
                <th className="p-3 font-medium">Kelas asal</th>
                <th className="p-3 font-medium">Santri aktif</th>
                <th className="p-3 font-medium min-w-[220px]">Jadi</th>
              </tr>
            </thead>
            <tbody>
              {data.classRoster.map((c) => {
                const row = rows[c.id];
                const incomplete = row.action === "naik" && !row.toClassId;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-text-primary whitespace-nowrap">{c.kelas}</td>
                    <td className="p-3 text-text-secondary">{c.activeStudentCount}</td>
                    <td className="p-3">
                      <select
                        value={row.action === "lulus" ? LULUS : row.toClassId}
                        onChange={(e) => updateRow(c.id, e.target.value)}
                        className={`h-9 rounded-lg border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong ${
                          incomplete ? "border-berat" : "border-border"
                        }`}
                      >
                        <option value="">-- pilih --</option>
                        {data.allActiveClasses
                          .filter((ac) => ac.id !== c.id)
                          .map((ac) => (
                            <option key={ac.id} value={ac.id}>
                              Naik ke {ac.kelas}
                            </option>
                          ))}
                        <option value={LULUS}>Lulus</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {result.status === "error" && (
        <Card className="border-l-2 border-l-berat">
          <p className="text-sm text-berat">{result.message}</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <label className="flex items-start gap-2.5 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={copyHomeroom}
            onChange={(e) => setCopyHomeroom(e.target.checked)}
            className="mt-0.5"
          />
          Salin wali kelas ke kelas tujuan juga (bisa diubah manual di Manajemen kelas kalau ada yang beda).
        </label>
        <label className="flex items-start gap-2.5 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          Saya sudah cek semua mapping kelas di atas dan yakin mau lanjutkan proses naik kelas ini.
        </label>
        <Button
          variant="primary"
          onClick={handleExecute}
          disabled={!canSubmit || isRunning}
          className="w-full sm:w-auto sm:self-end"
        >
          {isRunning ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" /> Memproses...
            </span>
          ) : (
            "Proses naik kelas"
          )}
        </Button>
      </Card>
    </div>
  );
}
