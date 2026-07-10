"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentsForClass } from "@/lib/actions/violations";
import { getViolationsReport, deleteViolation, type ReportRow, type AcademicYearOption } from "@/lib/actions/reports";
import type { ClassRow, StudentRow } from "@/types/database";

type SortKey = "studentName" | "kelas" | "severity" | "dateAt";
type SortDir = "asc" | "desc";

const SEVERITY_RANK: Record<string, number> = { ringan: 1, sedang: 2, berat: 3 };

function severityLabel(s: ReportRow["severity"]) {
  if (s === "ringan") return "Ringan";
  if (s === "sedang") return "Sedang";
  if (s === "berat") return "Berat";
  return "-";
}

function formatDate(dateAt: string) {
  return new Date(dateAt + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LaporanClient({
  classes,
  academicYears,
}: {
  classes: ClassRow[];
  academicYears: AcademicYearOption[];
}) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("dateAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  async function fetchReport() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getViolationsReport({
        classId: classId || undefined,
        studentId: studentId || undefined,
        academicYearId: academicYearId || undefined,
      });
      setRows(data);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, studentId, academicYearId]);

  async function handleClassChange(id: string) {
    setClassId(id);
    setStudentId("");
    setStudents([]);
    if (!id) return;
    const result = await getStudentsForClass(id);
    setStudents(result);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "severity") {
        cmp = (SEVERITY_RANK[a.severity ?? ""] ?? 0) - (SEVERITY_RANK[b.severity ?? ""] ?? 0);
      } else if (sortKey === "dateAt") {
        cmp = a.dateAt.localeCompare(b.dateAt);
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan pelanggaran ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingId(id);
    const result = await deleteViolation(id);
    setDeletingId(null);
    if (result.success) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      alert(`Gagal menghapus: ${result.error}`);
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown size={12} className="text-text-muted" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Tahun ajaran</label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          >
            <option value="">Semua tahun ajaran</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.label}
                {ay.is_active ? " (aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Kelas</label>
          <select
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          >
            <option value="">Semua kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kelas}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Santri</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={!classId}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong disabled:opacity-50"
          >
            <option value="">Semua santri</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading && (
        <Card className="flex items-center justify-center py-12 gap-2 text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin" />
          Memuat laporan...
        </Card>
      )}

      {!loading && errorMsg && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-berat">{errorMsg}</p>
        </Card>
      )}

      {!loading && !errorMsg && sortedRows.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-text-primary">Tidak ada pelanggaran yang cocok dengan filter ini.</p>
          <p className="text-xs text-text-secondary">Coba ubah atau kosongkan filter di atas.</p>
        </Card>
      )}

      {!loading && !errorMsg && sortedRows.length > 0 && (
        <>
          <p className="text-xs text-text-secondary">{sortedRows.length} pelanggaran ditemukan</p>

          {/* Mobile: kartu bertumpuk */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {sortedRows.map((r) => (
              <Card key={r.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">{r.studentName}</div>
                    <div className="text-xs text-text-secondary">{r.kelas}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    aria-label="Hapus"
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
                  >
                    {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.severity && <Badge severity={r.severity}>{severityLabel(r.severity)}</Badge>}
                  <span className="text-xs text-text-secondary">{r.violation}</span>
                </div>
                <div className="text-xs text-text-muted">
                  {formatDate(r.dateAt)}
                  {r.timeAt ? ` \u00b7 ${r.timeAt.slice(0, 5)}` : ""}
                </div>
                {r.notes && <div className="text-xs text-text-secondary">{r.notes}</div>}
              </Card>
            ))}
          </div>

          {/* Desktop: tabel dengan header yang bisa diklik buat sort */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    <th className="p-3 font-medium">
                      <button onClick={() => toggleSort("studentName")} className="flex items-center gap-1.5">
                        Santri <SortIcon column="studentName" />
                      </button>
                    </th>
                    <th className="p-3 font-medium">
                      <button onClick={() => toggleSort("kelas")} className="flex items-center gap-1.5">
                        Kelas <SortIcon column="kelas" />
                      </button>
                    </th>
                    <th className="p-3 font-medium">Pelanggaran</th>
                    <th className="p-3 font-medium">
                      <button onClick={() => toggleSort("severity")} className="flex items-center gap-1.5">
                        Tingkat <SortIcon column="severity" />
                      </button>
                    </th>
                    <th className="p-3 font-medium">
                      <button onClick={() => toggleSort("dateAt")} className="flex items-center gap-1.5">
                        Tanggal <SortIcon column="dateAt" />
                      </button>
                    </th>
                    <th className="p-3 font-medium">Keterangan</th>
                    <th className="p-3 font-medium sr-only">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-text-primary whitespace-nowrap">{r.studentName}</td>
                      <td className="p-3 text-text-secondary whitespace-nowrap">{r.kelas}</td>
                      <td className="p-3 text-text-secondary">{r.violation}</td>
                      <td className="p-3">
                        {r.severity && <Badge severity={r.severity}>{severityLabel(r.severity)}</Badge>}
                      </td>
                      <td className="p-3 text-text-secondary whitespace-nowrap">
                        {formatDate(r.dateAt)}
                        {r.timeAt ? ` \u00b7 ${r.timeAt.slice(0, 5)}` : ""}
                      </td>
                      <td className="p-3 text-text-secondary max-w-[200px] truncate">{r.notes ?? "-"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          aria-label="Hapus"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
                        >
                          {deletingId === r.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
