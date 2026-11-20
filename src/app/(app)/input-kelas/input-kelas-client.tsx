"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardX, Loader2, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { TimeSelect } from "@/components/ui/time-select";
import { getStudentsForClass, saveViolations } from "@/lib/actions/violations";
import { FOLLOWUP_OTHER } from "@/lib/followups";
import { cn } from "@/lib/utils";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";
import type { FollowupType } from "@/lib/actions/followups";

const LAINNYA = "__LAINNYA__";

type RowState = {
  violationTypeId: string;
  customLabel: string;
  severity: "ringan" | "sedang" | "berat" | "";
  timeAt: string;
  dateAt: string;
  notes: string;
  // Pembinaan: "later" = menyusul (bawaan), "now" = langsung dibina saat itu.
  followMode: "later" | "now";
  followLabel: string;
  followOther: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(defaultFollowLabel: string): RowState {
  return {
    violationTypeId: "",
    customLabel: "",
    severity: "",
    timeAt: "",
    dateAt: today(),
    notes: "",
    followMode: "later",
    followLabel: defaultFollowLabel,
    followOther: "",
  };
}

function hasViolation(row: RowState) {
  return Boolean(row.violationTypeId === LAINNYA ? row.customLabel.trim() : row.violationTypeId);
}

/** Pilihan Menyusul / Sudah dibina -- dipakai di tabel (PC) dan kartu (HP). */
function FollowModeToggle({
  mode,
  onChange,
  full,
}: {
  mode: RowState["followMode"];
  onChange: (mode: RowState["followMode"]) => void;
  full?: boolean;
}) {
  return (
    <div className={cn("inline-flex bg-surface-2 rounded-lg p-0.5 gap-0.5", full && "flex w-full")}>
      <button
        type="button"
        aria-pressed={mode === "later"}
        onClick={() => onChange("later")}
        className={cn(
          "h-8 px-2.5 rounded-md text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors",
          full && "flex-1",
          mode === "later" ? "bg-surface text-text-primary font-medium shadow-sm" : "text-text-secondary"
        )}
      >
        <Clock size={12} /> Menyusul
      </button>
      <button
        type="button"
        aria-pressed={mode === "now"}
        onClick={() => onChange("now")}
        className={cn(
          "h-8 px-2.5 rounded-md text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors",
          full && "flex-1",
          mode === "now" ? "bg-brand text-brand-on font-medium" : "text-text-secondary"
        )}
      >
        <Check size={12} /> Sudah dibina
      </button>
    </div>
  );
}

export function InputKelasClient({
  classes,
  violationTypes,
  followupTypes,
}: {
  classes: ClassRow[];
  violationTypes: ViolationType[];
  followupTypes: FollowupType[];
}) {
  const router = useRouter();
  const defaultFollowLabel = followupTypes[0]?.label ?? FOLLOWUP_OTHER;

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saveState, setSaveState] = useState<
    | { status: "idle" }
    | { status: "success"; count: number; followedUp: number }
    | { status: "error"; message: string }
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
    setRows(Object.fromEntries(result.map((s) => [s.id, emptyRow(defaultFollowLabel)])));
    setLoadingStudents(false);
  }

  function updateRow(studentId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }

  /** Salin pilihan pembinaan satu baris ke semua baris yang sudah diisi pelanggarannya. */
  function applyFollowToAll(sourceId: string) {
    setRows((prev) => {
      const source = prev[sourceId];
      const next = { ...prev };
      for (const [id, row] of Object.entries(prev)) {
        if (hasViolation(row)) {
          next[id] = {
            ...row,
            followMode: source.followMode,
            followLabel: source.followLabel,
            followOther: source.followOther,
          };
        }
      }
      return next;
    });
  }

  function handleSave() {
    if (!students) return;

    const missingSeverity = students.some((s) => {
      const row = rows[s.id];
      return hasViolation(row) && !row.severity;
    });
    if (missingSeverity) {
      setSaveState({
        status: "error",
        message: "Ada baris yang belum dipilih tingkat pelanggarannya (ringan/sedang/berat).",
      });
      return;
    }

    const missingFollowOther = students.some((s) => {
      const row = rows[s.id];
      return (
        hasViolation(row) &&
        row.followMode === "now" &&
        row.followLabel === FOLLOWUP_OTHER &&
        !row.followOther.trim()
      );
    });
    if (missingFollowOther) {
      setSaveState({
        status: "error",
        message: "Ada baris yang memilih pembinaan \"Lainnya\" tapi bentuknya belum ditulis.",
      });
      return;
    }

    startSaving(async () => {
      const entries = students.map((s) => {
        const row = rows[s.id];
        const violationLabel =
          row.violationTypeId === LAINNYA
            ? row.customLabel
            : violationTypes.find((v) => v.id === row.violationTypeId)?.label ?? "";
        const followLabel = row.followLabel === FOLLOWUP_OTHER ? row.followOther.trim() : row.followLabel;
        return {
          studentId: s.id,
          violationTypeId: row.violationTypeId === LAINNYA ? null : row.violationTypeId || null,
          violationLabel,
          severity: row.severity || null,
          timeAt: row.timeAt,
          dateAt: row.dateAt,
          notes: row.notes,
          followup: row.followMode === "now" ? { labels: [followLabel], notes: "" } : null,
        };
      });

      const result = await saveViolations(classId, entries);
      if (result.success) {
        setSaveState({ status: "success", count: result.count, followedUp: result.followedUp });
        setRows(Object.fromEntries(students.map((s) => [s.id, emptyRow(defaultFollowLabel)])));
        // Biar angka "belum dibina" di menu samping ikut ter-update.
        router.refresh();
      } else {
        setSaveState({ status: "error", message: result.error });
      }
    });
  }

  function renderFollowSelect(studentId: string, row: RowState, size: "sm" | "md") {
    const h = size === "sm" ? "h-9" : "h-10";
    return (
      <>
        <select
          value={row.followLabel}
          onChange={(e) => updateRow(studentId, { followLabel: e.target.value })}
          aria-label="Bentuk pembinaan"
          className={cn(
            h,
            "rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          )}
        >
          {followupTypes.map((t) => (
            <option key={t.id} value={t.label}>
              {t.label}
            </option>
          ))}
          <option value={FOLLOWUP_OTHER}>Lainnya...</option>
        </select>
        {row.followLabel === FOLLOWUP_OTHER && (
          <input
            value={row.followOther}
            onChange={(e) => updateRow(studentId, { followOther: e.target.value })}
            placeholder="Tulis bentuk pembinaan"
            className={cn(
              h,
              "rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            )}
          />
        )}
        <button
          type="button"
          onClick={() => applyFollowToAll(studentId)}
          className="self-start text-[11px] text-brand-text underline underline-offset-2"
        >
          Samakan ke semua baris terisi
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <label htmlFor="kelas" className="block text-xs font-medium text-text-secondary mb-1.5">
          Pilih kelas
        </label>
        <Combobox
          value={classId}
          onChange={handleClassChange}
          options={classes.map((c) => ({ value: c.id, label: c.kelas }))}
          placeholder="-- pilih kelas --"
        />
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
              const row = rows[s.id] ?? emptyRow(defaultFollowLabel);
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
                  <select
                    value={row.severity}
                    onChange={(e) => updateRow(s.id, { severity: e.target.value as RowState["severity"] })}
                    className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                  >
                    <option value="">-- tingkat pelanggaran --</option>
                    <option value="ringan">Ringan</option>
                    <option value="sedang">Sedang</option>
                    <option value="berat">Berat</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-text-secondary">Jam</label>
                      <TimeSelect
                        value={row.timeAt}
                        onChange={(v) => updateRow(s.id, { timeAt: v })}
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

                  {hasViolation(row) && (
                    <div className="flex flex-col gap-2 border-t border-border pt-2.5">
                      <label className="text-[11px] text-text-secondary">Pembinaan</label>
                      <FollowModeToggle
                        mode={row.followMode}
                        onChange={(m) => updateRow(s.id, { followMode: m })}
                        full
                      />
                      {row.followMode === "now" && renderFollowSelect(s.id, row, "md")}
                    </div>
                  )}
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
                    <th className="p-3 font-medium min-w-[200px]">Pelanggaran</th>
                    <th className="p-3 font-medium">Jam</th>
                    <th className="p-3 font-medium">Tanggal</th>
                    <th className="p-3 font-medium">Keterangan</th>
                    <th className="p-3 font-medium min-w-[220px]">Pembinaan</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const row = rows[s.id] ?? emptyRow(defaultFollowLabel);
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0 align-top">
                        <td className="p-3 pt-5 text-text-primary whitespace-nowrap">{s.name}</td>
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
                            <select
                              value={row.severity}
                              onChange={(e) =>
                                updateRow(s.id, { severity: e.target.value as RowState["severity"] })
                              }
                              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                            >
                              <option value="">-- tingkat --</option>
                              <option value="ringan">Ringan</option>
                              <option value="sedang">Sedang</option>
                              <option value="berat">Berat</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          <TimeSelect
                            value={row.timeAt}
                            onChange={(v) => updateRow(s.id, { timeAt: v })}
                            size="sm"
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
                        <td className="p-3">
                          {hasViolation(row) ? (
                            <div className="flex flex-col gap-1.5">
                              <FollowModeToggle
                                mode={row.followMode}
                                onChange={(m) => updateRow(s.id, { followMode: m })}
                              />
                              {row.followMode === "now" && renderFollowSelect(s.id, row, "sm")}
                            </div>
                          ) : (
                            <span className="block pt-2 text-xs text-text-muted">Isi pelanggaran dulu</span>
                          )}
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
                  <span className="flex items-center gap-1.5 text-brand-text flex-wrap">
                    <Check size={14} /> {saveState.count} pelanggaran tersimpan
                    {saveState.followedUp > 0 || saveState.count - saveState.followedUp > 0
                      ? `: ${[
                          saveState.followedUp > 0 ? `${saveState.followedUp} sudah dibina` : "",
                          saveState.count - saveState.followedUp > 0
                            ? `${saveState.count - saveState.followedUp} menyusul`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(", ")}.`
                      : "."}
                    {saveState.count - saveState.followedUp > 0 && (
                      <Link href="/pembinaan" className="font-medium underline underline-offset-2">
                        Buka daftar pembinaan
                      </Link>
                    )}
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
