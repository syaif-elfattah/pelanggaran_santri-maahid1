"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeSelect } from "@/components/ui/time-select";
import { updateViolation, type ReportRow } from "@/lib/actions/reports";
import { formatActor } from "@/lib/followups";
import type { ViolationType } from "@/types/database";

const LAINNYA = "__LAINNYA__";

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong";

/** Form edit satu pelanggaran -- dibuka dari tombol pensil di Laporan. */
export function EditViolationModal({
  row,
  violationTypes,
  onClose,
  onSaved,
}: {
  row: ReportRow;
  violationTypes: ViolationType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Jenis pelanggaran dicocokkan lewat namanya; kalau nggak ada di daftar
  // (isian "Lainnya" waktu input), form langsung kebuka di mode Lainnya.
  const matched = violationTypes.find((v) => v.label.toLowerCase() === row.violation.trim().toLowerCase());
  const [typeId, setTypeId] = useState(matched ? matched.id : LAINNYA);
  const [customLabel, setCustomLabel] = useState(matched ? "" : row.violation);
  const [severity, setSeverity] = useState<ReportRow["severity"] | "">(row.severity ?? "");
  const [dateAt, setDateAt] = useState(row.dateAt);
  const [timeAt, setTimeAt] = useState(row.timeAt ? row.timeAt.slice(0, 5) : "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSave() {
    const label = typeId === LAINNYA ? customLabel.trim() : violationTypes.find((v) => v.id === typeId)?.label ?? "";
    if (!label) {
      setError("Pilih atau isi jenis pelanggaran.");
      return;
    }
    if (!severity) {
      setError("Pilih tingkat pelanggaran (ringan/sedang/berat).");
      return;
    }
    if (!dateAt) {
      setError("Tanggal wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateViolation(row.id, {
      violationTypeId: typeId === LAINNYA ? null : typeId,
      violationLabel: label,
      severity,
      dateAt,
      timeAt,
      notes,
    });
    setSaving(false);
    if (result.success) onSaved();
    else setError(result.error ?? "Gagal menyimpan perubahan.");
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-start justify-center sm:pt-16 sm:px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-violation-title"
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-t-2xl sm:rounded-xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="edit-violation-title" className="font-display font-medium text-base text-text-primary">
              Edit pelanggaran
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {row.studentName} · {row.kelas}
            </p>
            {row.createdByName && (
              <p className="text-[11px] text-text-muted">
                Dicatat oleh {formatActor(row.createdByName, row.createdByRole)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className="w-8 h-8 -mr-1.5 -mt-1 shrink-0 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-violation-type" className="text-xs font-medium text-text-secondary">
            Pelanggaran
          </label>
          <select
            id="edit-violation-type"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className={fieldClass}
          >
            {violationTypes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
            <option value={LAINNYA}>Lainnya...</option>
          </select>
          {typeId === LAINNYA && (
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Isi detail pelanggaran"
              className={fieldClass}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-violation-severity" className="text-xs font-medium text-text-secondary">
            Tingkat pelanggaran
          </label>
          <select
            id="edit-violation-severity"
            value={severity ?? ""}
            onChange={(e) => setSeverity(e.target.value as ReportRow["severity"] | "")}
            className={fieldClass}
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
            <label htmlFor="edit-violation-date" className="text-xs font-medium text-text-secondary">
              Tanggal
            </label>
            <input
              id="edit-violation-date"
              type="date"
              value={dateAt}
              onChange={(e) => setDateAt(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-violation-notes" className="text-xs font-medium text-text-secondary">
            Keterangan
          </label>
          <input
            id="edit-violation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opsional"
            className={fieldClass}
          />
        </div>

        {error && <p className="text-xs text-berat">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Simpan perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
