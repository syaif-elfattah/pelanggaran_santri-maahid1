"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Trash2, Loader2, Download, MessageCircle, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
  lockedToOwnClass = false,
}: {
  classes: ClassRow[];
  academicYears: AcademicYearOption[];
  lockedToOwnClass?: boolean;
}) {
  const [academicYearId, setAcademicYearId] = useState(
    () => academicYears.find((ay) => ay.is_active)?.id ?? ""
  );
  const [classId, setClassId] = useState(() => (lockedToOwnClass && classes.length === 1 ? classes[0].id : ""));
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Kalau kelasnya udah kekunci dari awal (wali kelas), Combobox-nya
  // disabled jadi handleClassChange nggak pernah kepanggil dari interaksi
  // user -- perlu ditrigger manual sekali di awal biar daftar santrinya keisi.
  useEffect(() => {
    if (classId) {
      getStudentsForClass(classId).then(setStudents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("dateAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [waSuccess, setWaSuccess] = useState(false);

  async function fetchReport() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getViolationsReport({
        classId: classId || undefined,
        studentId: studentId || undefined,
        academicYearId: academicYearId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
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
  }, [classId, studentId, academicYearId, fromDate, toDate]);

  function reportMeta() {
    const scopeLabel = classId ? classes.find((c) => c.id === classId)?.kelas ?? "Kelas terpilih" : "Semua kelas";
    const periodLabel =
      fromDate && toDate
        ? `${formatDate(fromDate)} -- ${formatDate(toDate)}`
        : fromDate
          ? `Sejak ${formatDate(fromDate)}`
          : toDate
            ? `Sampai ${formatDate(toDate)}`
            : "Semua periode";
    return { scopeLabel, periodLabel };
  }

  async function handleDownloadPdf() {
    setPdfError(null);
    setIsDownloading(true);
    try {
      const { scopeLabel, periodLabel } = reportMeta();
      const res = await fetch("/api/laporan/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: sortedRows, scopeLabel, periodLabel }),
      });
      if (!res.ok) throw new Error("Gagal membuat PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "laporan-pelanggaran.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Gagal membuat PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleKirimWa() {
    setPdfError(null);
    setWaSuccess(false);
    setIsSendingWa(true);
    try {
      const { scopeLabel, periodLabel } = reportMeta();
      const res = await fetch("/api/laporan/kirim-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: sortedRows, scopeLabel, periodLabel, classId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Gagal kirim ke WhatsApp.");

      const text = encodeURIComponent(
        `Assalamu'alaikum Bapak/Ibu ${data.waliName}, berikut laporan pelanggaran santri ${scopeLabel} (${periodLabel}): ${data.publicUrl}`
      );
      window.open(`https://wa.me/${data.waliPhone}?text=${text}`, "_blank");
      setWaSuccess(true);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Gagal kirim ke WhatsApp.");
    } finally {
      setIsSendingWa(false);
    }
  }


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
          <Combobox
            value={classId}
            onChange={handleClassChange}
            options={classes.map((c) => ({ value: c.id, label: c.kelas }))}
            placeholder="Semua kelas"
            disabled={lockedToOwnClass && classes.length <= 1}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Santri</label>
          <Combobox
            value={studentId}
            onChange={setStudentId}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Semua santri"
            disabled={!classId}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Dari tanggal</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-text-secondary">Sampai tanggal</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-text-secondary">{sortedRows.length} pelanggaran ditemukan</p>
            <div className="flex items-center gap-2 flex-wrap">
              {waSuccess && (
                <span className="text-xs text-brand-text flex items-center gap-1">
                  <Check size={13} /> WhatsApp terbuka
                </span>
              )}
              <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={handleKirimWa}
                disabled={!classId || isSendingWa}
                title={!classId ? "Pilih satu kelas dulu buat kirim ke wali kelasnya" : undefined}
              >
                {isSendingWa ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageCircle size={14} />
                )}
                Kirim WA
              </Button>
            </div>
          </div>
          {pdfError && <p className="text-xs text-berat">{pdfError}</p>}

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
                        Kelas saat itu <SortIcon column="kelas" />
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
