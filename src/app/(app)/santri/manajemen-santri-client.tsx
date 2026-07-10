"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Loader2, ChevronDown, ChevronUp, Upload, Download, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getStudents,
  addStudent,
  markStudentStatus,
  getStudentHistory,
  getStudentViolationHistory,
  importStudents,
  type StudentStatusRow,
  type EnrollmentHistoryRow,
  type ViolationHistoryRow,
  type ImportRowError,
} from "@/lib/actions/students";
import type { ClassRow } from "@/types/database";

function statusLabel(status: string) {
  if (status === "aktif") return "Aktif";
  if (status === "lulus") return "Lulus";
  if (status === "keluar") return "Keluar";
  if (status === "naik") return "Naik";
  if (status === "pindah") return "Pindah";
  return status;
}

function statusTone(status: string): "aktif" | "lulus" | "keluar" | "neutral" {
  if (status === "aktif") return "aktif";
  if (status === "lulus") return "lulus";
  if (status === "keluar") return "keluar";
  return "neutral";
}

export function ManajemenSantriClient({ classes }: { classes: ClassRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("aktif");
  const [classId, setClassId] = useState("");

  const [students, setStudents] = useState<StudentStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addClassId, setAddClassId] = useState("");

  const [showImportForm, setShowImportForm] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: ImportRowError[] } | null>(
    null
  );
  const [addState, setAddState] = useState<{ status: "idle" } | { status: "error"; message: string }>({
    status: "idle",
  });
  const [isSaving, startSaving] = useTransition();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<EnrollmentHistoryRow[] | null>(null);
  const [violationHistory, setViolationHistory] = useState<ViolationHistoryRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  async function fetchStudents() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getStudents({
        status: status || undefined,
        classId: classId || undefined,
        search: search || undefined,
      });
      setStudents(data);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal memuat data santri.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(fetchStudents, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, classId]);

  async function handleImportFile(file: File) {
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<{ Nama?: string; Kelas?: string }>(sheet, { defval: "" });

      const parsed = rows.map((r) => ({ name: String(r.Nama ?? ""), kelas: String(r.Kelas ?? "") }));

      if (parsed.length === 0) {
        setParseError("File kosong atau format kolomnya nggak sesuai template.");
        setIsParsing(false);
        return;
      }

      const result = await importStudents(parsed);
      if (result.success) {
        setImportResult({ imported: result.imported, errors: result.errors });
        if (result.imported > 0) fetchStudents();
      } else {
        setParseError(result.error);
      }
    } catch {
      setParseError("Gagal baca file. Pastiin formatnya .xlsx sesuai template.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleAdd() {
    if (!addName.trim() || !addClassId) {
      setAddState({ status: "error", message: "Nama dan kelas wajib diisi." });
      return;
    }
    startSaving(async () => {
      const result = await addStudent(addName, addClassId);
      if (result.success) {
        setAddName("");
        setAddClassId("");
        setShowAddForm(false);
        setAddState({ status: "idle" });
        fetchStudents();
      } else {
        setAddState({ status: "error", message: result.error });
      }
    });
  }

  async function toggleHistory(studentId: string) {
    if (expandedId === studentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(studentId);
    setHistoryLoading(true);
    const [enrollments, violations] = await Promise.all([
      getStudentHistory(studentId),
      getStudentViolationHistory(studentId),
    ]);
    setHistory(enrollments);
    setViolationHistory(violations);
    setHistoryLoading(false);
  }

  async function handleStatusChange(studentId: string, newStatus: "aktif" | "lulus" | "keluar") {
    const label =
      newStatus === "keluar"
        ? "Tandai santri ini keluar?"
        : newStatus === "lulus"
          ? "Tandai santri ini lulus?"
          : "Aktifkan kembali santri ini di kelas sekarang?";
    if (!confirm(label)) return;
    setStatusChangingId(studentId);
    const result = await markStudentStatus(studentId, newStatus);
    setStatusChangingId(null);
    if (result.success) {
      fetchStudents();
    } else {
      alert(`Gagal mengubah status: ${result.error}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama santri..."
          className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
        >
          <option value="aktif">Aktif</option>
          <option value="lulus">Lulus</option>
          <option value="keluar">Keluar</option>
          <option value="">Semua status</option>
        </select>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
        >
          <option value="">Semua kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kelas}
            </option>
          ))}
        </select>
        <Button variant="primary" onClick={() => setShowAddForm((v) => !v)} className="whitespace-nowrap">
          <Plus size={15} />
          Tambah santri
        </Button>
        <Button variant="secondary" onClick={() => setShowImportForm((v) => !v)} className="whitespace-nowrap">
          <Upload size={15} />
          Import Excel
        </Button>
      </Card>

      {showImportForm && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-text-secondary max-w-sm">
              Download template dulu, isi kolom Nama & Kelas (contoh nama kelas ada di sheet kedua), lalu upload lagi file yang udah diisi.
            </p>
            <a
              href="/api/students/template"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs text-text-primary hover:border-border-strong transition-colors whitespace-nowrap"
            >
              <Download size={13} />
              Download template
            </a>
          </div>

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

          {isParsing && (
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Memproses file...
            </p>
          )}

          {parseError && <p className="text-xs text-berat">{parseError}</p>}

          {importResult && (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <p className="text-xs text-brand-text flex items-center gap-1.5">
                <Check size={13} /> {importResult.imported} santri berhasil diimpor.
              </p>
              {importResult.errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-berat">{importResult.errors.length} baris gagal:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-[11px] text-text-secondary">
                      Baris {e.row} ({e.name}): {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {showAddForm && (
        <Card className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary">Nama santri</label>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Nama lengkap"
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary">Kelas</label>
            <select
              value={addClassId}
              onChange={(e) => setAddClassId(e.target.value)}
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
          <Button variant="primary" onClick={handleAdd} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
          {addState.status === "error" && (
            <p className="text-xs text-berat w-full">{addState.message}</p>
          )}
        </Card>
      )}

      {loading && (
        <Card className="flex items-center justify-center py-12 gap-2 text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin" />
          Memuat...
        </Card>
      )}

      {!loading && errorMsg && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-berat">{errorMsg}</p>
        </Card>
      )}

      {!loading && !errorMsg && students.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-text-primary">Tidak ada santri yang cocok.</p>
          <p className="text-xs text-text-secondary">Coba ubah pencarian atau filter di atas.</p>
        </Card>
      )}

      {!loading && !errorMsg && students.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary">{students.length} santri</p>
          {students.map((s) => (
            <Card key={s.studentId} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-3 flex-wrap">
                <button
                  onClick={() => toggleHistory(s.studentId)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  {expandedId === s.studentId ? (
                    <ChevronUp size={15} className="text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-text-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">{s.studentName}</div>
                    <div className="text-xs text-text-secondary">
                      {s.kelas} &middot; {s.academicYearLabel}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge severity={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value as "aktif" | "lulus" | "keluar";
                      if (val) handleStatusChange(s.studentId, val);
                      e.target.value = "";
                    }}
                    disabled={statusChangingId === s.studentId}
                    aria-label={`Ubah status ${s.studentName}`}
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text-secondary focus:outline-none focus:border-border-strong disabled:opacity-50"
                  >
                    <option value="">Ubah status...</option>
                    {s.status !== "aktif" && <option value="aktif">Aktifkan</option>}
                    {s.status !== "lulus" && <option value="lulus">Tandai lulus</option>}
                    {s.status !== "keluar" && <option value="keluar">Tandai keluar</option>}
                  </select>
                  {statusChangingId === s.studentId && (
                    <Loader2 size={14} className="animate-spin text-text-muted" />
                  )}
                </div>
              </div>

              {expandedId === s.studentId && (
                <div className="border-t border-border bg-surface-2 px-3 py-2.5 flex flex-col gap-3">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                      <Loader2 size={12} className="animate-spin" /> Memuat riwayat...
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-text-secondary mb-0.5">
                          Riwayat kelas
                        </p>
                        {(history ?? []).map((h) => (
                          <div key={h.id} className="flex items-center justify-between text-xs">
                            <span className="text-text-primary">
                              {h.academicYearLabel} &middot; {h.kelas}
                            </span>
                            <Badge severity={statusTone(h.status)}>{statusLabel(h.status)}</Badge>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
                        <p className="text-[11px] font-medium text-text-secondary mb-0.5">
                          Riwayat pelanggaran {violationHistory ? `(${violationHistory.length})` : ""}
                        </p>
                        {violationHistory && violationHistory.length === 0 && (
                          <p className="text-xs text-text-secondary">Belum ada pelanggaran tercatat.</p>
                        )}
                        {(violationHistory ?? []).map((v) => (
                          <div key={v.id} className="flex items-start justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <span className="text-text-primary">{v.violation}</span>
                              <span className="text-text-secondary">
                                {" "}
                                &middot; {v.kelas} &middot; {v.academicYearLabel} &middot;{" "}
                                {new Date(v.dateAt + "T00:00:00").toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {v.severity && (
                              <Badge severity={v.severity} className="shrink-0">
                                {v.severity === "ringan" ? "Ringan" : v.severity === "sedang" ? "Sedang" : "Berat"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
