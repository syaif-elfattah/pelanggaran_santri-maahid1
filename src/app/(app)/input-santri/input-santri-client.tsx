"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, X, Clock, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { TimeSelect } from "@/components/ui/time-select";
import { FollowupPicker, resolvePickedLabels } from "@/components/ui/followup-picker";
import { getStudentsForClass, saveViolations } from "@/lib/actions/violations";
import { FOLLOWUP_OTHER } from "@/lib/followups";
import { cn } from "@/lib/utils";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";
import type { FollowupType } from "@/lib/actions/followups";

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
  severity: "ringan" | "sedang" | "berat" | null;
  timeAt: string;
  dateAt: string;
  notes: string;
  followup: { labels: string[]; notes: string } | null;
};

export function InputSantriClient({
  classes,
  violationTypes,
  followupTypes,
}: {
  classes: ClassRow[];
  violationTypes: ViolationType[];
  followupTypes: FollowupType[];
}) {
  const router = useRouter();
  const followOptions = followupTypes.map((t) => t.label);

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [violationTypeId, setViolationTypeId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [severity, setSeverity] = useState<"ringan" | "sedang" | "berat" | "">("");
  const [timeAt, setTimeAt] = useState("");
  const [dateAt, setDateAt] = useState(today());
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Pembinaan: bawaannya "menyusul" -- kalau petugas lupa milih, pelanggaran
  // tetap masuk daftar tunggu, jadi nggak ada yang terlewat.
  const [followMode, setFollowMode] = useState<"later" | "now">("later");
  const [followSelected, setFollowSelected] = useState<string[]>([]);
  const [followOther, setFollowOther] = useState("");
  const [followNotes, setFollowNotes] = useState("");

  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [saveState, setSaveState] = useState<
    | { status: "idle" }
    | { status: "success"; count: number; followedUp: number }
    | { status: "error"; message: string }
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
    if (!severity) {
      setAddError("Pilih tingkat pelanggaran (ringan/sedang/berat).");
      return;
    }

    let followup: PendingEntry["followup"] = null;
    if (followMode === "now") {
      if (followSelected.includes(FOLLOWUP_OTHER) && !followOther.trim()) {
        setAddError("Tulis bentuk pembinaan lainnya dulu.");
        return;
      }
      const labels = resolvePickedLabels(followOptions, followSelected, followOther);
      if (labels.length === 0) {
        setAddError("Pilih minimal satu bentuk pembinaan, atau pilih Menyusul.");
        return;
      }
      followup = { labels, notes: followNotes };
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
        severity,
        timeAt,
        dateAt,
        notes,
        followup,
      },
    ]);

    // Reset field yang spesifik per-entri, tapi kelas & tanggal dibiarin
    // sama -- biasanya nambah beberapa santri itu di kelas & hari yang sama.
    setStudentId("");
    setViolationTypeId("");
    setCustomLabel("");
    setSeverity("");
    setTimeAt("");
    setNotes("");
    setFollowMode("later");
    setFollowSelected([]);
    setFollowOther("");
    setFollowNotes("");
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
      let totalFollowed = 0;
      const savedClassIds = new Set<string>();
      for (const [cId, entries] of groups) {
        const result = await saveViolations(
          cId,
          entries.map((e) => ({
            studentId: e.studentId,
            violationTypeId: e.violationTypeId,
            violationLabel: e.violationLabel,
            severity: e.severity,
            timeAt: e.timeAt,
            dateAt: e.dateAt,
            notes: e.notes,
            followup: e.followup,
          }))
        );
        if (!result.success) {
          setSaveState({ status: "error", message: result.error });
          // Kelompok kelas yang sudah tersimpan dibuang dari daftar biar
          // nggak kesimpan dobel kalau tombol simpan ditekan lagi.
          if (savedClassIds.size > 0) {
            setPending((prev) => prev.filter((p) => !savedClassIds.has(p.classId)));
            router.refresh();
          }
          return;
        }
        savedClassIds.add(cId);
        totalSaved += result.count;
        totalFollowed += result.followedUp;
      }

      setSaveState({ status: "success", count: totalSaved, followedUp: totalFollowed });
      setPending([]);
      router.refresh();
    });
  }

  const laterCount = saveState.status === "success" ? saveState.count - saveState.followedUp : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-lg flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Kelas</label>
            <Combobox
              value={classId}
              onChange={handleClassChange}
              options={classes.map((c) => ({ value: c.id, label: c.kelas }))}
              placeholder="-- pilih kelas --"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Santri</label>
            <Combobox
              value={studentId}
              onChange={setStudentId}
              options={students.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={loadingStudents ? "Memuat..." : "-- pilih santri --"}
              disabled={!classId || loadingStudents}
            />
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Tingkat pelanggaran</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          >
            <option value="">-- pilih tingkat --</option>
            <option value="ringan">Ringan</option>
            <option value="sedang">Sedang</option>
            <option value="berat">Berat</option>
          </select>
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

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="text-xs font-medium text-text-secondary">Pembinaan</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status pembinaan">
            <button
              type="button"
              role="radio"
              aria-checked={followMode === "later"}
              onClick={() => setFollowMode("later")}
              className={cn(
                "flex items-start gap-2 text-left rounded-lg border p-2.5 transition-colors",
                followMode === "later"
                  ? "border-text-secondary ring-1 ring-text-secondary"
                  : "border-border hover:border-border-strong"
              )}
            >
              <Clock size={15} className="mt-0.5 shrink-0 text-text-secondary" />
              <span>
                <span className="block text-sm text-text-primary font-medium">Menyusul</span>
                <span className="block text-xs text-text-secondary">Masuk daftar belum dibina</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={followMode === "now"}
              onClick={() => setFollowMode("now")}
              className={cn(
                "flex items-start gap-2 text-left rounded-lg border p-2.5 transition-colors",
                followMode === "now"
                  ? "border-brand ring-1 ring-brand bg-brand-tint"
                  : "border-border hover:border-border-strong"
              )}
            >
              <CircleCheck
                size={15}
                className={cn("mt-0.5 shrink-0", followMode === "now" ? "text-brand-text" : "text-text-secondary")}
              />
              <span>
                <span className="block text-sm text-text-primary font-medium">Sudah dibina</span>
                <span className="block text-xs text-text-secondary">Langsung dibina saat itu</span>
              </span>
            </button>
          </div>
          {followMode === "now" && (
            <div className="flex flex-col gap-2.5 rounded-lg bg-surface-2 p-3">
              <span className="text-xs font-medium text-text-secondary">
                Bentuk pembinaan <span className="font-normal text-text-muted">· boleh lebih dari satu</span>
              </span>
              <FollowupPicker
                options={followOptions}
                selected={followSelected}
                onChange={setFollowSelected}
                otherText={followOther}
                onOtherTextChange={setFollowOther}
              />
              <input
                value={followNotes}
                onChange={(e) => setFollowNotes(e.target.value)}
                placeholder="Catatan pembinaan (opsional)"
                className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
              />
              <p className="text-[11px] text-text-muted">Pembinanya tercatat sebagai akun kamu (yang mencatat pelanggaran ini).</p>
            </div>
          )}
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
                <div className="mt-1">
                  {p.followup ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-tint text-brand-text">
                      <Check size={11} /> Sudah dibina: {p.followup.labels.join(", ")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md text-text-secondary ring-1 ring-inset ring-border-strong">
                      <Clock size={11} /> Menyusul
                    </span>
                  )}
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
            <span className="flex items-center gap-1.5 text-brand-text flex-wrap">
              <Check size={14} /> {saveState.count} pelanggaran tersimpan:{" "}
              {[
                saveState.followedUp > 0 ? `${saveState.followedUp} sudah dibina` : "",
                laterCount > 0 ? `${laterCount} menyusul` : "",
              ]
                .filter(Boolean)
                .join(", ")}
              .
              {laterCount > 0 && (
                <Link href="/pembinaan" className="font-medium underline underline-offset-2">
                  Buka daftar pembinaan
                </Link>
              )}
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
