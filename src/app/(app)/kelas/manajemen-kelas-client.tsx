"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Pencil, Power, Trash2, X, FileSpreadsheet, Upload, Download, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getClassesManagement,
  addClass,
  setClassActive,
  deleteClass,
  assignHomeroomTeacher,
  previewImportClasses,
  importClasses,
  type ClassManagementRow,
  type ValidatedClassImportRow,
} from "@/lib/actions/classes";

export function ManajemenKelasClient({ initialClasses }: { initialClasses: ClassManagementRow[] }) {
  const [classes, setClasses] = useState(initialClasses);
  const [refreshing, setRefreshing] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [waliName, setWaliName] = useState("");
  const [waliPhone, setWaliPhone] = useState("");
  const [waliError, setWaliError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [showImportForm, setShowImportForm] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ValidatedClassImportRow[] | null>(null);
  const [isImporting, startImporting] = useTransition();
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null);

  async function refresh() {
    setRefreshing(true);
    const data = await getClassesManagement();
    setClasses(data);
    setRefreshing(false);
  }

  function handleExportExcel() {
    const rows = classes.map((c, i) => ({
      No: i + 1,
      Kelas: c.kelas,
      Status: c.isActive ? "Aktif" : "Nonaktif",
      "Wali Kelas": c.homeroomTeacherName ?? "",
      "No. WA Wali Kelas": c.homeroomTeacherPhone ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kelas & Wali Kelas");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `kelas-wali-kelas-${today}.xlsx`);
  }

  function closeImportForm() {
    setShowImportForm(false);
    setPreview(null);
    setParseError(null);
    setImportResult(null);
  }

  async function handleImportFile(file: File) {
    setIsParsing(true);
    setParseError(null);
    setPreview(null);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<{ Kelas?: string; "Wali Kelas"?: string; "No. WA Wali Kelas"?: string }>(
        sheet,
        { defval: "" }
      );
      const parsed = rows.map((r) => ({
        kelas: String(r["Kelas"] ?? ""),
        waliName: String(r["Wali Kelas"] ?? ""),
        waliPhone: String(r["No. WA Wali Kelas"] ?? ""),
      }));

      if (parsed.length === 0) {
        setParseError("File kosong atau format kolomnya nggak sesuai template.");
        return;
      }

      const result = await previewImportClasses(parsed);
      setPreview(result);
    } catch {
      setParseError("Gagal baca file. Pastiin formatnya .xlsx sesuai template.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleConfirmImport() {
    if (!preview) return;
    const rows = preview
      .filter((p) => p.status !== "error")
      .map((p) => ({ kelas: p.kelas, waliName: p.waliName, waliPhone: p.waliPhone }));
    startImporting(async () => {
      const result = await importClasses(rows);
      if (result.success) {
        setImportResult({ created: result.created, updated: result.updated });
        setPreview(null);
        refresh();
      } else {
        setParseError(result.error);
      }
    });
  }

  function handleAddClass() {
    if (!newClassName.trim()) {
      setAddError("Nama kelas wajib diisi.");
      return;
    }
    startSaving(async () => {
      const result = await addClass(newClassName);
      if (result.success) {
        setNewClassName("");
        setShowAddForm(false);
        setAddError(null);
        refresh();
      } else {
        setAddError(result.error);
      }
    });
  }

  function openWaliForm(row: ClassManagementRow) {
    setEditingId(row.id);
    setWaliName(row.homeroomTeacherName ?? "");
    setWaliPhone(row.homeroomTeacherPhone ?? "");
    setWaliError(null);
  }

  function handleSaveWali(classId: string) {
    startSaving(async () => {
      const result = await assignHomeroomTeacher(classId, waliName, waliPhone);
      if (result.success) {
        setEditingId(null);
        refresh();
      } else {
        setWaliError(result.error);
      }
    });
  }

  async function handleToggleActive(row: ClassManagementRow) {
    setBusyId(row.id);
    const result = await setClassActive(row.id, !row.isActive);
    setBusyId(null);
    if (result.success) {
      refresh();
    } else {
      alert(result.error);
    }
  }

  async function handleDelete(row: ClassManagementRow) {
    if (!confirm(`Hapus kelas "${row.kelas}" permanen? Cuma bisa kalau belum pernah dipakai sama sekali.`)) return;
    setBusyId(row.id);
    const result = await deleteClass(row.id);
    setBusyId(null);
    if (result.success) {
      refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2 flex-wrap">
        <Button variant="secondary" onClick={handleExportExcel} disabled={classes.length === 0}>
          <FileSpreadsheet size={15} />
          Export Excel
        </Button>
        <Button variant="secondary" onClick={() => setShowImportForm((v) => !v)}>
          <Upload size={15} />
          Import Excel
        </Button>
        <Button variant="primary" onClick={() => setShowAddForm((v) => !v)}>
          <Plus size={15} />
          Tambah kelas
        </Button>
      </div>

      {showImportForm && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-xs text-text-secondary max-w-sm">
              Download template dulu, isi kolom Kelas, Wali Kelas, dan No. WA Wali Kelas, lalu upload lagi.
              Kelas yang namanya udah ada bakal di-update wali kelasnya; yang belum ada bakal dibikin baru.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/api/classes/template"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs text-text-primary hover:border-border-strong transition-colors whitespace-nowrap"
              >
                <Download size={13} />
                Download template
              </a>
              <button
                onClick={closeImportForm}
                aria-label="Tutup"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!preview && (
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
              disabled={isParsing}
              className="text-xs text-text-secondary file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border file:border-border file:bg-surface file:text-text-primary file:text-xs disabled:opacity-50"
            />
          )}

          {isParsing && (
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Membaca file...
            </p>
          )}

          {parseError && <p className="text-xs text-berat">{parseError}</p>}

          {importResult && (
            <p className="text-xs text-brand-text flex items-center gap-1.5">
              <Check size={13} /> {importResult.created} kelas baru dibuat, {importResult.updated} kelas di-update
              wali kelasnya.
            </p>
          )}

          {preview && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-text-secondary">
                {preview.filter((p) => p.status === "new").length} kelas baru,{" "}
                {preview.filter((p) => p.status === "update").length} update kelas yang udah ada
                {preview.some((p) => p.status === "error") &&
                  `, ${preview.filter((p) => p.status === "error").length} error (dikecualikan)`}{" "}
                -- cek dulu sebelum konfirmasi.
              </p>
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                {preview.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="text-text-primary">{p.kelas}</span>
                      {p.waliName && <span className="text-text-secondary"> &middot; {p.waliName}</span>}
                      {p.reason && <span className="text-text-muted"> &middot; {p.reason}</span>}
                    </div>
                    <Badge severity={p.status === "new" ? "aktif" : p.status === "update" ? "sedang" : "berat"}>
                      {p.status === "new" ? "Baru" : p.status === "update" ? "Update" : "Error"}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="secondary" onClick={() => setPreview(null)}>
                  Batal, upload ulang
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={isImporting || preview.every((p) => p.status === "error")}
                >
                  {isImporting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" /> Menyimpan...
                    </span>
                  ) : (
                    "Konfirmasi import"
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showAddForm && (
        <Card className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary">Nama kelas</label>
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder='misal "10 I"'
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="primary" onClick={handleAddClass} disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewClassName("");
                setAddError(null);
              }}
              aria-label="Tutup"
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          {addError && <p className="text-xs text-berat w-full">{addError}</p>}
        </Card>
      )}

      {refreshing && (
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Memperbarui...
        </p>
      )}

      <div className="flex flex-col gap-2">
        {classes.map((row) => (
          <Card key={row.id} className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm text-text-primary font-medium">{row.kelas}</span>
                {!row.isActive && <Badge severity="keluar">Nonaktif</Badge>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openWaliForm(row)}
                  className="h-auto py-1.5 px-2.5 flex flex-col items-start rounded-lg text-xs hover:bg-surface-2 transition-colors text-left"
                >
                  {row.homeroomTeacherName ? (
                    <>
                      <span className="flex items-center gap-1.5 text-text-primary">
                        <Pencil size={11} className="shrink-0" />
                        {row.homeroomTeacherName}
                      </span>
                      {row.homeroomTeacherPhone && (
                        <span className="text-[11px] text-text-muted pl-[18px] tabular-nums">
                          {row.homeroomTeacherPhone}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <Pencil size={12} className="shrink-0" />
                      Atur wali kelas
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleToggleActive(row)}
                  disabled={busyId === row.id}
                  aria-label={row.isActive ? "Nonaktifkan kelas" : "Aktifkan kelas"}
                  title={row.isActive ? "Nonaktifkan kelas" : "Aktifkan kelas"}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 transition-colors"
                >
                  {busyId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  disabled={busyId === row.id}
                  aria-label="Hapus kelas"
                  title="Hapus kelas"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {editingId === row.id && (
              <div className="border-t border-border bg-surface-2 p-3 flex flex-col sm:flex-row gap-2.5 items-start sm:items-end flex-wrap">
                <div className="flex flex-col gap-1 flex-1 w-full">
                  <label className="text-[11px] text-text-secondary">Nama wali kelas</label>
                  <input
                    value={waliName}
                    onChange={(e) => setWaliName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 w-full">
                  <label className="text-[11px] text-text-secondary">No. WhatsApp</label>
                  <input
                    value={waliPhone}
                    onChange={(e) => setWaliPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveWali(row.id)}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none"
                  >
                    Simpan
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingId(null)} className="flex-1 sm:flex-none">
                    Batal
                  </Button>
                </div>
                {waliError && <p className="text-xs text-berat w-full">{waliError}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
