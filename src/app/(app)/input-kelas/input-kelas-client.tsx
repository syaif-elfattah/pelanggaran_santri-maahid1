"use client";

import { useState, useTransition } from "react";
import { ClipboardX, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentsForClass, saveViolations } from "@/lib/actions/violations";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";

const LAINNYA = "__LAINNYA__";

type RowState = {
  violationTypeId: string;
  customLabel: string;
  timeAt: string;
  dateAt: string;
  notes: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(): RowState {
  return { violationTypeId: "", customLabel: "", timeAt: "", dateAt: today(), notes: "" };
}

export function InputKelasClient({
  classes,
  violationTypes,
}: {
  classes: ClassRow[];
  violationTypes: ViolationType[];
}) {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "success"; count: number } | { status: "error"; message: string }
  >({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  async function handleClassChange(id: string) {
    setClassId(id);
    setSaveState({ status: "idle" });
    if (!id) {
      setStudents(null);
      return;
    }
    setLoadingStudents(true);
    setStudents(null);
    const result = await getStudentsForClass(id);
    setStudents(result);
    setRows(Object.fromEntries(result.map((s) => [s.id, emptyRow()])));
    setLoadingStudents(false);
  }

  function updateRow(studentId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }

  function handleSave() {
    if (!students) return;
    startSaving(async () => {
      const entries = students.map((s) => {
        const row = rows[s.id];
        const violationLabel =
          row.violationTypeId === LAINNYA
            ? row.customLabel
            : violationTypes.find((v) => v.id === row.violationTypeId)?.label ?? "";
        return {
          studentId: s.id,
          violationTypeId: row.violationTypeId === LAINNYA ? null : row.violationTypeId || null,
          violationLabel,
          timeAt: row.timeAt,
          dateAt: row.dateAt,
          notes: row.notes,
        };
      });

      const result = await saveViolations(classId, entries);
      if (result.success) {
        setSaveState({ status: "success", count: result.count });
        setRows(Object.fromEntries(students.map((s) => [s.id, emptyRow()])));
      } else {
        setSaveState({ status: "error", message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <label htmlFor="kelas" className="block text-xs font-medium text-text-secondary mb-1.5">
          Pilih kelas
        </label>
        <select
          id="kelas"
          value={classId}
          onChange={(e) => handleClassChange(e.target.value)}
          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
        >
          <option value="">-- pilih kelas --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kelas}
            </option>
          ))}
        </select>
      </div>

      {!classId && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-text-primary">Pilih kelas dulu buat mulai input.</p>
          <p className="text-xs text-text-secondary">Daftar santri di kelas itu bakal muncul di sini.</p>
        </Card>
      )}

      {classId && loadingStudents && (
        <Card className="flex items-center justify-center py-12 gap-2 text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin" />
          Memuat santri...
        </Card>
      )}

      {classId && !loadingStudents && students && students.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <ClipboardX size={20} className="text-text-muted mb-1" />
          <p className="text-sm text-text-primary">Belum ada santri aktif di kelas ini.</p>
          <p className="text-xs text-text-secondary max-w-xs">
            Cek lagi di halaman Naik kelas / Santri baru kalau ini seharusnya tidak kosong.
          </p>
        </Card>
      )}

      {classId && !loadingStudents && students && students.length > 0 && (
        <>
          {/* Mobile: satu kartu per santri, field ditumpuk -- tabel 5 kolom nggak
              kebaca di layar sempit. */}
          <div className="flex flex-col gap-3 md:hidden">
            {students.map((s) => {
              const row = rows[s.id] ?? emptyRow();
              return (
                <Card key={s.id} className="flex flex-col gap-2.5">
                  <div className="text-sm text-text-primary font-medium">{s.name}</div>

                  <select
                    value={row.violationTypeId}
                    onChange={(e) => updateRow(s.id, { violationTypeId: e.target.value })}
                    className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                  >
                    <option value="">-- pilih pelanggaran --</option>
                    {violationTypes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                    <option value={LAINNYA}>Lainnya...</option>
                  </select>
                  {row.violationTypeId === LAINNYA && (
                    <input
                      value={row.customLabel}
                      onChange={(e) => updateRow(s.id, { customLabel: e.target.value })}
                      placeholder="Isi detail pelanggaran"
                      className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-text-secondary">Jam</label>
                      <input
                        type="time"
                        value={row.timeAt}
                        onChange={(e) => updateRow(s.id, { timeAt: e.target.value })}
                        className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-text-secondary">Tanggal</label>
                      <input
                        type="date"
                        value={row.dateAt}
                        onChange={(e) => updateRow(s.id, { dateAt: e.target.value })}
                        className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                      />
                    </div>
                  </div>

                  <input
                    value={row.notes}
                    onChange={(e) => updateRow(s.id, { notes: e.target.value })}
                    placeholder="Keterangan (opsional)"
                    className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                  />
                </Card>
              );
            })}
          </div>

          {/* Desktop: tabel biasa, semua kolom kelihatan sekaligus. */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    <th className="p-3 font-medium">Nama santri</th>
                    <th className="p-3 font-medium min-w-[220px]">Pelanggaran</th>
                    <th className="p-3 font-medium">Jam</th>
                    <th className="p-3 font-medium">Tanggal</th>
                    <th className="p-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const row = rows[s.id] ?? emptyRow();
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-text-primary whitespace-nowrap">{s.name}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5">
                            <select
                              value={row.violationTypeId}
                              onChange={(e) => updateRow(s.id, { violationTypeId: e.target.value })}
                              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                            >
                              <option value="">-- pilih --</option>
                              {violationTypes.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.label}
                                </option>
                              ))}
                              <option value={LAINNYA}>Lainnya...</option>
                            </select>
                            {row.violationTypeId === LAINNYA && (
                              <input
                                value={row.customLabel}
                                onChange={(e) => updateRow(s.id, { customLabel: e.target.value })}
                                placeholder="Isi detail pelanggaran"
                                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="time"
                            value={row.timeAt}
                            onChange={(e) => updateRow(s.id, { timeAt: e.target.value })}
                            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={row.dateAt}
                            onChange={(e) => updateRow(s.id, { dateAt: e.target.value })}
                            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            value={row.notes}
                            onChange={(e) => updateRow(s.id, { notes: e.target.value })}
                            placeholder="Opsional"
                            className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Bar simpan -- sticky di bawah layar pas mobile biar selalu kejangkau jempol. */}
          <div className="sticky bottom-0 bg-bg pt-2 -mx-4 sm:mx-0 px-4 sm:px-0 sm:static sm:bg-transparent">
            <Card className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs" role="status">
                {saveState.status === "success" && (
                  <span className="flex items-center gap-1.5 text-brand-text">
                    <Check size={14} /> {saveState.count} pelanggaran tersimpan.
                  </span>
                )}
                {saveState.status === "error" && (
                  <span className="text-berat">{saveState.message}</span>
                )}
              </div>
              <Button variant="primary" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? "Menyimpan..." : "Simpan pelanggaran"}
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
