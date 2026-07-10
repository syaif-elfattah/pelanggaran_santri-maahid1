"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentsForClass, saveViolations } from "@/lib/actions/violations";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";

const LAINNYA = "__LAINNYA__";

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "success" } | { status: "error"; message: string }
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

  function handleSave() {
    if (!studentId) {
      setSaveState({ status: "error", message: "Pilih santri dulu." });
      return;
    }
    const violationLabel =
      violationTypeId === LAINNYA
        ? customLabel
        : violationTypes.find((v) => v.id === violationTypeId)?.label ?? "";

    if (!violationLabel.trim()) {
      setSaveState({ status: "error", message: "Pilih atau isi jenis pelanggaran." });
      return;
    }

    startSaving(async () => {
      const result = await saveViolations(classId, [
        {
          studentId,
          violationTypeId: violationTypeId === LAINNYA ? null : violationTypeId || null,
          violationLabel,
          timeAt,
          dateAt,
          notes,
        },
      ]);

      if (result.success) {
        setSaveState({ status: "success" });
        setViolationTypeId("");
        setCustomLabel("");
        setNotes("");
      } else {
        setSaveState({ status: "error", message: result.error });
      }
    });
  }

  return (
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
            onChange={(e) => {
              setStudentId(e.target.value);
              setSaveState({ status: "idle" });
            }}
            disabled={!classId || loadingStudents}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong disabled:opacity-50"
          >
            <option value="">
              {loadingStudents ? "Memuat..." : "-- pilih santri --"}
            </option>
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
          <input
            type="time"
            value={timeAt}
            onChange={(e) => setTimeAt(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
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

      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <div className="text-xs" role="status">
          {saveState.status === "success" && (
            <span className="flex items-center gap-1.5 text-brand-text">
              <Check size={14} /> Pelanggaran tersimpan.
            </span>
          )}
          {saveState.status === "error" && <span className="text-berat">{saveState.message}</span>}
        </div>
        <Button variant="primary" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" /> Menyimpan...
            </span>
          ) : (
            "Simpan pelanggaran"
          )}
        </Button>
      </div>
    </Card>
  );
}
