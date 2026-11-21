"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Trash2, Loader2, Download, MessageCircle, Check, Clock, Archive, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { Pagination } from "@/components/ui/pagination";
import { getStudentsForClass } from "@/lib/actions/violations";
import {
  getViolationsReport,
  getViolationsForExport,
  deleteViolation,
  type ReportRow,
  type ReportSortKey,
  type ReportSortDir,
  type AcademicYearOption,
} from "@/lib/actions/reports";
import { REPORT_PAGE_SIZE } from "@/lib/pagination";
import { formatActor, formatShortDate, type FollowupStatus } from "@/lib/followups";
import type { ClassRow, StudentRow, ViolationType } from "@/types/database";
import { EditViolationModal } from "./edit-violation-modal";

type SortKey = ReportSortKey;
type SortDir = ReportSortDir;

function severityLabel(s: ReportRow["severity"]) {
  if (s === "ringan") return "Ringan";
  if (s === "sedang") return "Sedang";
  if (s === "berat") return "Berat";
  return "-";
}

function FollowupCell({ row }: { row: ReportRow }) {
  if (row.followupStatus === "sudah") {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-brand-tint text-brand-text whitespace-nowrap">
          <Check size={11} /> Sudah dibina
        </span>
        <span className="text-[11px] text-text-secondary">
          {(row.followupLabels ?? []).join(", ")}
          {row.followupDoneAt ? ` · ${formatShortDate(row.followupDoneAt)}` : ""}
        </span>
        <span className="text-[11px] text-text-muted">
          {row.followupIsDirect ? "Langsung saat input · " : "Oleh "}
          {formatActor(row.followupBy, row.followupByRole)}
        </span>
      </div>
    );
  }
  if (row.followupStatus === "belum") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md text-text-secondary ring-1 ring-inset ring-border-strong whitespace-nowrap">
        <Clock size={11} /> Belum dibina
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-surface-2 text-text-muted whitespace-nowrap"
      title="Dicatat sebelum fitur pembinaan aktif"
    >
      <Archive size={11} /> Data lama
    </span>
  );
}

function formatDate(dateAt: string) {
  return new Date(dateAt + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type DatePreset = "last7" | "today" | "week" | "month" | "semester";

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "last7", label: "7 hari terakhir" },
  { key: "today", label: "Hari ini" },
  { key: "week", label: "Minggu ini" },
  { key: "month", label: "Bulan ini" },
  { key: "semester", label: "Semester ini" },
];

/**
 * "7 hari terakhir": hari ini + 6 hari ke belakang (tampilan awal Laporan).
 * "Minggu ini" dihitung Sabtu s/d Kamis (Jumat di luar hitungan minggu).
 * "Semester ini": Juli-Desember atau Januari-Juni tergantung bulan sekarang.
 */
function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  if (preset === "last7") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { from: fmt(start), to: fmt(now) };
  }

  if (preset === "today") {
    return { from: fmt(now), to: fmt(now) };
  }

  if (preset === "week") {
    // getDay(): Minggu=0 ... Sabtu=6. Jarak mundur ke Sabtu terdekat.
    const daysSinceSaturday = (now.getDay() + 1) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - daysSinceSaturday);
    const end = new Date(start);
    end.setDate(start.getDate() + 5); // Sabtu + 5 hari = Kamis
    return { from: fmt(start), to: fmt(end) };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(start), to: fmt(end) };
  }

  // semester
  const year = now.getFullYear();
  const isGanjil = now.getMonth() >= 6; // Juli(6) - Desember(11)
  return isGanjil
    ? { from: fmt(new Date(year, 6, 1)), to: fmt(new Date(year, 11, 31)) }
    : { from: fmt(new Date(year, 0, 1)), to: fmt(new Date(year, 5, 30)) };
}

export function LaporanClient({
  classes,
  academicYears,
  violationTypes,
  lockedToOwnClass = false,
}: {
  classes: ClassRow[];
  academicYears: AcademicYearOption[];
  violationTypes: ViolationType[];
  lockedToOwnClass?: boolean;
}) {
  const [academicYearId, setAcademicYearId] = useState(
    () => academicYears.find((ay) => ay.is_active)?.id ?? ""
  );
  // Default: semua kelas tercentang (array isi semua id) -- kalau kekunci
  // ke kelas sendiri (wali kelas), langsung ke kelas itu doang.
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() =>
    lockedToOwnClass ? classes.map((c) => c.id) : classes.map((c) => c.id)
  );
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  // Tampilan awal: 7 hari terakhir -- yang paling sering dicek sehari-hari.
  // Klik "Bersihkan tanggal" kalau mau lihat semua periode.
  const [fromDate, setFromDate] = useState(() => getPresetRange("last7").from);
  const [toDate, setToDate] = useState(() => getPresetRange("last7").to);
  const [followupStatus, setFollowupStatus] = useState<FollowupStatus | "">("");
  const [editingRow, setEditingRow] = useState<ReportRow | null>(null);

  // Daftar santri buat filter cuma masuk akal kalau PERSIS 1 kelas
  // tercentang -- selain itu (0, sebagian, atau semua) dikosongin/nonaktif.
  // studentId selalu direset di sini juga -- soalnya begitu kelasnya ganti
  // (walau tetap 1 kelas tapi beda), santri yang sebelumnya kepilih belum
  // tentu masih relevan.
  useEffect(() => {
    setStudentId("");
    if (selectedClassIds.length === 1) {
      getStudentsForClass(selectedClassIds[0]).then(setStudents);
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassIds]);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
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

  const allClassIds = classes.map((c) => c.id);
  const allClassesSelected = selectedClassIds.length === allClassIds.length;

  function currentFilters() {
    return {
      // Semua kelas kepilih = sama aja kayak nggak difilter -- kirim
      // undefined biar query nggak perlu nyebut semua id satu-satu.
      classIds: allClassesSelected ? undefined : selectedClassIds,
      studentId: studentId || undefined,
      academicYearId: academicYearId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      followupStatus: followupStatus || undefined,
    };
  }

  async function fetchReport(targetPage = page) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getViolationsReport(currentFilters(), targetPage, sortKey, sortDir);
      setRows(data.rows);
      setTotalCount(data.totalCount);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }

  // Filter berubah -> selalu balik ke halaman 1, biar nggak nyangkut di
  // halaman 5 padahal hasil filter barunya cuma 2 halaman.
  useEffect(() => {
    setPage(1);
    fetchReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassIds, studentId, academicYearId, fromDate, toDate, followupStatus, sortKey, sortDir]);

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    fetchReport(nextPage);
  }

  function reportMeta() {
    let scopeLabel = "Semua kelas";
    if (!allClassesSelected) {
      if (selectedClassIds.length === 1) {
        scopeLabel = classes.find((c) => c.id === selectedClassIds[0])?.kelas ?? "Kelas terpilih";
      } else if (selectedClassIds.length > 1) {
        scopeLabel = `${selectedClassIds.length} kelas terpilih`;
      } else {
        scopeLabel = "Tidak ada kelas dipilih";
      }
    }
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
      // Ambil SEMUA baris hasil filter -- bukan cuma halaman yang lagi
      // kebuka -- biar isi PDF-nya utuh sesuai filter.
      const exportResult = await getViolationsForExport(currentFilters());
      if (!exportResult.success) throw new Error(exportResult.error);

      const res = await fetch("/api/laporan/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: exportResult.rows, scopeLabel, periodLabel }),
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
      const exportResult = await getViolationsForExport(currentFilters());
      if (!exportResult.success) throw new Error(exportResult.error);

      const res = await fetch("/api/laporan/kirim-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: exportResult.rows, scopeLabel, periodLabel, classId: selectedClassIds[0] }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Gagal kirim ke WhatsApp.");

      // Ringkasan pembinaan cuma ngitung pelanggaran yang dilacak -- data
      // lama (sebelum fitur pembinaan) nggak disebut.
      const sudah = exportResult.rows.filter((r) => r.followupStatus === "sudah").length;
      const belum = exportResult.rows.filter((r) => r.followupStatus === "belum").length;
      const summary =
        sudah + belum > 0
          ? ` ${exportResult.rows.length} pelanggaran: ${sudah} sudah dibina, ${belum} belum dibina.`
          : "";
      const text = encodeURIComponent(
        `Assalamu'alaikum Bapak/Ibu ${data.waliName}, berikut laporan pelanggaran santri ${scopeLabel} (${periodLabel}).${summary} ${data.publicUrl}`
      );
      window.open(`https://wa.me/${data.waliPhone}?text=${text}`, "_blank");
      setWaSuccess(true);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Gagal kirim ke WhatsApp.");
    } finally {
      setIsSendingWa(false);
    }
  }

  function applyDatePreset(preset: DatePreset) {
    const { from, to } = getPresetRange(preset);
    setFromDate(from);
    setToDate(to);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan pelanggaran ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingId(id);
    const result = await deleteViolation(id);
    setDeletingId(null);
    if (result.success) {
      // Refetch, bukan cuma buang dari tampilan -- soalnya total & isi
      // halaman ikut bergeser begitu ada baris yang hilang.
      fetchReport();
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
      <Card className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
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
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-text-secondary">Kelas</label>
          <MultiSelectFilter
            selected={selectedClassIds}
            onChange={setSelectedClassIds}
            options={classes.map((c) => ({ value: c.id, label: c.kelas }))}
            disabled={lockedToOwnClass && classes.length <= 1}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-text-secondary">Santri</label>
          <Combobox
            value={studentId}
            onChange={setStudentId}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={selectedClassIds.length === 1 ? "Semua santri" : "Pilih 1 kelas dulu"}
            disabled={selectedClassIds.length !== 1}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-text-secondary">Dari tanggal</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-text-secondary">Sampai tanggal</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-text-secondary">Status pembinaan</label>
          <select
            value={followupStatus}
            onChange={(e) => setFollowupStatus(e.target.value as FollowupStatus | "")}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          >
            <option value="">Semua status</option>
            <option value="belum">Belum dibina</option>
            <option value="sudah">Sudah dibina</option>
            <option value="data_lama">Data lama</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-text-secondary">Preset tanggal</label>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map(({ key, label }) => {
              const range = getPresetRange(key);
              const active = fromDate === range.from && toDate === range.to;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyDatePreset(key)}
                  aria-pressed={active}
                  className={
                    active
                      ? "h-8 px-3 rounded-lg border border-brand bg-brand-tint text-xs text-brand-text font-medium transition-colors"
                      : "h-8 px-3 rounded-lg border border-border text-xs text-text-primary hover:border-border-strong transition-colors"
                  }
                >
                  {label}
                </button>
              );
            })}
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="h-8 px-3 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Bersihkan tanggal (semua periode)
              </button>
            )}
          </div>
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

      {!loading && !errorMsg && rows.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-text-primary">Tidak ada pelanggaran yang cocok dengan filter ini.</p>
          <p className="text-xs text-text-secondary">Coba ubah atau kosongkan filter di atas.</p>
        </Card>
      )}

      {!loading && !errorMsg && rows.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-text-secondary">{totalCount} pelanggaran ditemukan</p>
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
                disabled={selectedClassIds.length !== 1 || isSendingWa}
                title={selectedClassIds.length !== 1 ? "Centang persis 1 kelas dulu buat kirim ke wali kelasnya" : undefined}
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
            {rows.map((r, i) => (
              <Card key={r.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className="text-xs text-text-muted tabular-nums shrink-0 pt-0.5">
                      {(page - 1) * REPORT_PAGE_SIZE + i + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">{r.studentName}</div>
                      <div className="text-xs text-text-secondary">{r.kelas}</div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => setEditingRow(r)}
                      aria-label="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      aria-label="Hapus"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
                    >
                      {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
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
                {r.createdByName && (
                  <div className="text-[11px] text-text-muted">Dicatat oleh {formatActor(r.createdByName, r.createdByRole)}</div>
                )}
                <div className="pt-1">
                  <FollowupCell row={r} />
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: tabel dengan header yang bisa diklik buat sort */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    <th className="p-3 font-medium w-10">No</th>
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
                    <th className="p-3 font-medium">Pembinaan</th>
                    <th className="p-3 font-medium">Keterangan</th>
                    <th className="p-3 font-medium sr-only">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-text-muted tabular-nums">
                        {(page - 1) * REPORT_PAGE_SIZE + i + 1}
                      </td>
                      <td className="p-3 text-text-primary whitespace-nowrap">{r.studentName}</td>
                      <td className="p-3 text-text-secondary whitespace-nowrap">{r.kelas}</td>
                      <td className="p-3 text-text-secondary">{r.violation}</td>
                      <td className="p-3">
                        {r.severity && <Badge severity={r.severity}>{severityLabel(r.severity)}</Badge>}
                      </td>
                      <td className="p-3 text-text-secondary whitespace-nowrap">
                        {formatDate(r.dateAt)}
                        {r.timeAt ? ` \u00b7 ${r.timeAt.slice(0, 5)}` : ""}
                        {r.createdByName && (
                          <div className="text-[11px] text-text-muted">
                            oleh {formatActor(r.createdByName, r.createdByRole)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 min-w-[150px]">
                        <FollowupCell row={r} />
                      </td>
                      <td className="p-3 text-text-secondary max-w-[200px] truncate">{r.notes ?? "-"}</td>
                      <td className="p-3">
                        <div className="flex items-center">
                        <button
                          onClick={() => setEditingRow(r)}
                          aria-label="Edit"
                          title="Edit pelanggaran"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {editingRow && (
            <EditViolationModal
              row={editingRow}
              violationTypes={violationTypes}
              onClose={() => setEditingRow(null)}
              onSaved={() => {
                setEditingRow(null);
                fetchReport();
              }}
            />
          )}

          <Pagination
            page={page}
            pageSize={REPORT_PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
