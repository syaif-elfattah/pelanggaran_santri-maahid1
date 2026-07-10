"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimeSelect } from "@/components/ui/time-select";
import { getStudentsForClass, saveViolations } from "@/lib/actions/violations";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";

const LAINNYA = "__LAINNYA__";

function today() {
  return new Date().toISOString().slice(0, 10);
}

type PendingEntry = {
  key: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  violationTypeId: string | null;
  violationLabel: string;
  timeAt: string;
  dateAt: string;
  notes: string;
};

export function InputSantriClient({
  classes,
  violationTypes,
}: {
  classes: ClassRow[];
  violationTypes: ViolationType[];
}) {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [violationTypeId, setViolationTypeId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [timeAt, setTimeAt] = useState("");
  const [dateAt, setDateAt] = useState(today());
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "success"; count: number } | { status: "error"; message: string }
  >({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  async function handleClassChange(id: string) {
    setClassId(id);
    setStudentId("");
    setStudents([]);
    if (!id) return;
    setLoadingStudents(true);
    const result = await getStudentsForClass(id);
    setStudents(result);
    setLoadingStudents(false);
  }

  function handleAddRow() {
    if (!studentId) {
      setAddError("Pilih santri dulu.");
      return;
    }
    const violationLabel =
      violationTypeId === LAINNYA
        ? customLabel
        : violationTypes.find((v) => v.id === violationTypeId)?.label ?? "";

    if (!violationLabel.trim()) {
      setAddError("Pilih atau isi jenis pelanggaran.");
      return;
    }

    const student = students.find((s) => s.id === studentId);
    const kelas = classes.find((c) => c.id === classId);

    setPending((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        classId,
        className: kelas?.kelas ?? "",
        studentId,
        studentName: student?.name ?? "",
        violationTypeId: violationTypeId === LAINNYA ? null : violationTypeId || null,
        violationLabel,
        timeAt,
        dateAt,
        notes,
      },
    ]);

    // Reset field yang spesifik per-entri, tapi kelas & tanggal dibiarin
    // sama -- biasanya nambah beberapa santri itu di kelas & hari yang sama.
    setStudentId("");
    setViolationTypeId("");
    setCustomLabel("");
    setTimeAt("");
    setNotes("");
    setAddError(null);
    setSaveState({ status: "idle" });
  }

  function removeRow(key: string) {
    setPending((prev) => prev.filter((p) => p.key !== key));
  }

  function handleSaveAll() {
    if (pending.length === 0) return;
    startSaving(async () => {
      const groups = new Map<string, PendingEntry[]>();
      for (const p of pending) {
        if (!groups.has(p.classId)) groups.set(p.classId, []);
        groups.get(p.classId)!.push(p);
      }

      let totalSaved = 0;
      for (const [cId, entries] of groups) {
        const result = await saveViolations(
          cId,
          entries.map((e) => ({
            studentId: e.studentId,
            violationTypeId: e.violationTypeId,
            violationLabel: e.violationLabel,
            timeAt: e.timeAt,
            dateAt: e.dateAt,
            notes: e.notes,
          }))
        );
        if (!result.success) {
          setSaveState({ status: "error", message: result.error });
          return;
        }
        totalSaved += result.count;
      }

      setSaveState({ status: "success", count: totalSaved });
      setPending([]);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-lg flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Kelas</label>
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
            >
              <option value="">-- pilih kelas --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kelas}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Santri</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!classId || loadingStudents}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong disabled:opacity-50"
            >
              <option value="">{loadingStudents ? "Memuat..." : "-- pilih santri --"}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Pelanggaran</label>
          <select
            value={violationTypeId}
            onChange={(e) => setViolationTypeId(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          >
            <option value="">-- pilih --</option>
            {violationTypes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
            <option value={LAINNYA}>Lainnya...</option>
          </select>
          {violationTypeId === LAINNYA && (
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Isi detail pelanggaran"
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Jam</label>
            <TimeSelect value={timeAt} onChange={setTimeAt} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Tanggal</label>
            <input
              type="date"
              value={dateAt}
              onChange={(e) => setDateAt(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Keterangan</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opsional"
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
          />
        </div>

        {addError && <p className="text-xs text-berat">{addError}</p>}

        <Button variant="secondary" onClick={handleAddRow} className="w-full sm:w-auto sm:self-end">
          <Plus size={15} />
          Tambah ke daftar
        </Button>
      </Card>

      {pending.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs text-text-secondary">
            {pending.length} pelanggaran siap disimpan
          </div>
          {pending.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {p.studentName} <span className="text-text-secondary">&middot; {p.className}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {p.violationLabel} &middot; {p.dateAt}
                </div>
              </div>
              <button
                onClick={() => removeRow(p.key)}
                aria-label="Hapus dari daftar"
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs" role="status">
          {saveState.status === "success" && (
            <span className="flex items-center gap-1.5 text-brand-text">
              <Check size={14} /> {saveState.count} pelanggaran tersimpan.
            </span>
          )}
          {saveState.status === "error" && <span className="text-berat">{saveState.message}</span>}
        </div>
        {pending.length > 0 && (
          <Button variant="primary" onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Menyimpan...
              </span>
            ) : (
              `Simpan semua (${pending.length})`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
