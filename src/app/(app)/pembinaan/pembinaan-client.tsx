"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, CircleCheck, Clock, Loader2, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { Pagination } from "@/components/ui/pagination";
import { FollowupPicker, resolvePickedLabels } from "@/components/ui/followup-picker";
import {
  getFollowupQueue,
  addFollowups,
  deleteFollowup,
  type FollowupType,
  type FollowupQueuePage,
  type FollowupQueueRow,
} from "@/lib/actions/followups";
import { FOLLOWUP_OTHER, FOLLOWUP_PAGE_SIZE, formatActor, formatShortDate } from "@/lib/followups";
import { cn } from "@/lib/utils";
import type { ClassRow } from "@/types/database";

type Tab = "belum" | "sudah";

function severityLabel(s: FollowupQueueRow["severity"]) {
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

/** Tanggal hari ini menurut jam perangkat (bukan UTC) -- format YYYY-MM-DD. */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(dateAt: string) {
  const [y, m, d] = dateAt.split("-").map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - then) / 86400000));
}

function WaitingAge({ dateAt }: { dateAt: string }) {
  const days = daysSince(dateAt);
  return (
    <span className={cn("text-xs", days >= 3 ? "text-sedang font-medium" : "text-text-muted")}>
      {days === 0 ? "Hari ini" : `${days} hari lalu`}
    </span>
  );
}

function FollowupModal({
  rows,
  options,
  onClose,
  onSaved,
}: {
  rows: FollowupQueueRow[];
  options: string[];
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [doneAt, setDoneAt] = useState(localToday());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSave() {
    if (selected.includes(FOLLOWUP_OTHER) && !otherText.trim()) {
      setError("Tulis bentuk pembinaan lainnya dulu.");
      return;
    }
    const labels = resolvePickedLabels(options, selected, otherText);
    if (labels.length === 0) {
      setError("Pilih minimal satu bentuk pembinaan.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await addFollowups(
      rows.map((r) => r.id),
      { labels, doneAt, notes }
    );
    setSaving(false);
    if (result.success) onSaved(result.count);
    else setError(result.error);
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
        aria-labelledby="followup-modal-title"
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-t-2xl sm:rounded-xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="followup-modal-title" className="font-display font-medium text-base text-text-primary">
              Catat pembinaan
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">{rows.length} pelanggaran</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className="w-8 h-8 -mr-1.5 -mt-1 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border border-border rounded-lg max-h-32 overflow-y-auto">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex justify-between gap-3 px-3 py-1.5 text-xs border-b border-border last:border-0"
            >
              <span className="text-text-primary truncate">
                {r.studentName} <span className="text-text-secondary">· {r.kelas}</span>
              </span>
              <span className="text-text-secondary text-right shrink-0">
                {r.violation} · {formatShortDate(r.dateAt)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">
            Bentuk pembinaan <span className="font-normal text-text-muted">· boleh lebih dari satu</span>
          </span>
          <FollowupPicker
            options={options}
            selected={selected}
            onChange={(next) => {
              setSelected(next);
              setError(null);
            }}
            otherText={otherText}
            onOtherTextChange={setOtherText}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="followup-date" className="text-xs font-medium text-text-secondary">
            Tanggal pembinaan
          </label>
          <input
            id="followup-date"
            type="date"
            value={doneAt}
            onChange={(e) => setDoneAt(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="followup-notes" className="text-xs font-medium text-text-secondary">
            Catatan <span className="font-normal text-text-muted">· opsional</span>
          </label>
          <textarea
            id="followup-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Misal: membaca surat Yasin di masjid setelah Ashar"
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-y"
          />
        </div>

        <p className="text-[11px] text-text-muted">Pembinanya tercatat sebagai akun yang sedang login.</p>

        {error && <p className="text-xs text-berat">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PembinaanClient({
  classes,
  followupTypes,
  defaultClassIds,
}: {
  classes: ClassRow[];
  followupTypes: FollowupType[];
  defaultClassIds: string[];
}) {
  const router = useRouter();
  const followOptions = followupTypes.map((t) => t.label);
  const allClassIds = classes.map((c) => c.id);

  const [tab, setTab] = useState<Tab>("belum");
  const [classIds, setClassIds] = useState<string[]>(defaultClassIds);
  const [severity, setSeverity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<FollowupQueuePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalIds, setModalIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  // Ketik nama -> tunggu sebentar baru cari, biar nggak query tiap huruf.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function load(targetPage: number) {
    const req = ++requestRef.current;
    setLoading(true);
    setErrorMsg(null);
    try {
      const allSelected = classIds.length === 0 || classIds.length === allClassIds.length;
      const result = await getFollowupQueue(
        {
          status: tab,
          classIds: allSelected ? undefined : classIds,
          severity: severity || undefined,
          search: search || undefined,
        },
        targetPage
      );
      if (req !== requestRef.current) return;
      // Halaman jadi kosong (misal semua isinya barusan dibina) -> mundur satu halaman.
      if (result.rows.length === 0 && targetPage > 1) {
        setPage(targetPage - 1);
        await load(targetPage - 1);
        return;
      }
      setData(result);
    } catch (e) {
      if (req === requestRef.current) setErrorMsg(e instanceof Error ? e.message : "Gagal memuat daftar pembinaan.");
    } finally {
      if (req === requestRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, classIds, severity, search]);

  function handlePageChange(next: number) {
    setPage(next);
    setSelected(new Set());
    load(next);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rows = data?.rows ?? [];
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleSelectAll() {
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function handleSaved(count: number) {
    setModalIds(null);
    setSelected(new Set());
    setToast(`${count} pelanggaran ditandai sudah dibina.`);
    load(page);
    // Angka "belum dibina" di menu samping ikut ter-update.
    router.refresh();
  }

  async function handleDeleteFollowup(id: string) {
    if (
      !confirm(
        "Hapus catatan pembinaan ini? Kalau ini satu-satunya catatan, pelanggarannya kembali ke daftar Belum dibina."
      )
    ) {
      return;
    }
    setDeletingId(id);
    const result = await deleteFollowup(id);
    setDeletingId(null);
    if (result.success) {
      setToast("Catatan pembinaan dihapus.");
      load(page);
      router.refresh();
    } else {
      alert(`Gagal menghapus: ${result.error}`);
    }
  }

  const hasFilter =
    !!search || !!severity || !(classIds.length === 0 || classIds.length === allClassIds.length);
  const modalRows = modalIds ? rows.filter((r) => modalIds.includes(r.id)) : [];

  function renderFollowups(r: FollowupQueueRow) {
    return (
      <div className="flex flex-col gap-2">
        {r.followups.map((f) => (
          <div key={f.id} className="flex items-start gap-2">
            <CircleCheck size={14} className="text-brand-text shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="text-text-primary">{f.labels.join(", ")}</div>
              <div className="text-text-secondary">
                {formatDate(f.doneAt)} · {formatActor(f.staffName, f.staffRole)}
                {f.isDirect ? " · langsung saat input" : ""}
              </div>
              {f.notes && <div className="text-text-muted italic">&ldquo;{f.notes}&rdquo;</div>}
            </div>
            {f.canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteFollowup(f.id)}
                disabled={deletingId === f.id}
                aria-label="Hapus catatan pembinaan"
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint transition-colors"
              >
                {deletingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setModalIds([r.id])}
          className="self-start flex items-center gap-1 text-xs text-brand-text font-medium hover:underline"
        >
          <Plus size={12} /> Tambah catatan
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="inline-flex self-start bg-surface-2 rounded-lg p-1 gap-1" role="tablist" aria-label="Status pembinaan">
          {(
            [
              { key: "belum", label: "Belum dibina", icon: Clock, count: data?.pendingCount },
              { key: "sudah", label: "Sudah dibina", icon: CircleCheck, count: data?.doneCount },
            ] as const
          ).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "h-8 px-3 rounded-md text-sm inline-flex items-center gap-1.5 transition-colors",
                tab === key ? "bg-surface text-text-primary font-medium shadow-sm" : "text-text-secondary"
              )}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && (
                <span className="text-xs tabular-nums text-text-muted font-semibold">{count}</span>
              )}
            </button>
          ))}
        </div>

        <Card className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-text-secondary">Kelas</label>
            <MultiSelectFilter
              selected={classIds}
              onChange={setClassIds}
              options={classes.map((c) => ({ value: c.id, label: c.kelas }))}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-text-secondary">Tingkat</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:border-border-strong"
            >
              <option value="">Semua tingkat</option>
              <option value="ringan">Ringan</option>
              <option value="sedang">Sedang</option>
              <option value="berat">Berat</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-[2] min-w-[180px]">
            <label className="text-xs font-medium text-text-secondary">Cari santri</label>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ketik nama santri"
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>
        </Card>
        <p className="text-[11px] text-text-muted">
          Hanya pelanggaran yang dicatat sejak fitur pembinaan aktif. Pelanggaran sebelumnya tercatat sebagai data lama.
        </p>
      </div>

      {loading && !data && (
        <Card className="flex items-center justify-center py-12 gap-2 text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin" />
          Memuat daftar...
        </Card>
      )}

      {errorMsg && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          <p className="text-sm text-berat">{errorMsg}</p>
        </Card>
      )}

      {!errorMsg && data && rows.length === 0 && !loading && (
        <Card className="flex flex-col items-center justify-center py-12 text-center gap-1">
          {tab === "belum" && !hasFilter ? (
            <>
              <BookOpenCheck size={22} className="text-brand-text mb-1" />
              <p className="text-sm text-text-primary">Semua pelanggaran sudah dibina.</p>
              <p className="text-xs text-text-secondary">
                Pelanggaran yang dipilih &quot;Menyusul&quot; saat input akan muncul di sini.
              </p>
            </>
          ) : tab === "sudah" && !hasFilter ? (
            <>
              <p className="text-sm text-text-primary">Belum ada catatan pembinaan.</p>
              <p className="text-xs text-text-secondary">Pelanggaran yang sudah dibina akan muncul di sini.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-primary">Tidak ada yang cocok dengan filter ini.</p>
              <p className="text-xs text-text-secondary">Coba ubah atau kosongkan filter di atas.</p>
            </>
          )}
        </Card>
      )}

      {!errorMsg && data && rows.length > 0 && (
        <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
          {/* Mobile: kartu bertumpuk */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {rows.map((r) => (
              <Card
                key={r.id}
                className={cn("flex flex-col gap-2", selected.has(r.id) && "border-brand")}
              >
                <div className="flex items-start gap-2.5">
                  {tab === "belum" && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      aria-label={`Pilih ${r.studentName}`}
                      className="mt-1 w-4 h-4 accent-brand"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-text-primary font-medium truncate">{r.studentName}</div>
                    <div className="text-xs text-text-secondary">{r.kelas}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.severity && <Badge severity={r.severity}>{severityLabel(r.severity)}</Badge>}
                  <span className="text-xs text-text-secondary">{r.violation}</span>
                </div>
                {r.notes && <div className="text-xs text-text-secondary">{r.notes}</div>}
                <div className="text-[11px] text-text-muted">
                  Dicatat oleh {formatActor(r.createdByName, r.createdByRole)}
                </div>
                {tab === "belum" ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted">
                      {formatDate(r.dateAt)}
                      {r.timeAt ? ` · ${r.timeAt.slice(0, 5)}` : ""} · <WaitingAge dateAt={r.dateAt} />
                    </span>
                    <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setModalIds([r.id])}>
                      Bina
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-text-muted">{formatDate(r.dateAt)}</div>
                    <div className="border-t border-border pt-2">{renderFollowups(r)}</div>
                  </>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop: tabel */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    {tab === "belum" && (
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAll}
                          aria-label="Pilih semua di halaman ini"
                          className="w-4 h-4 accent-brand align-middle"
                        />
                      </th>
                    )}
                    <th className="p-3 font-medium">Santri</th>
                    <th className="p-3 font-medium">Pelanggaran</th>
                    <th className="p-3 font-medium">Tingkat</th>
                    <th className="p-3 font-medium">Tanggal</th>
                    {tab === "belum" ? (
                      <th className="p-3 font-medium sr-only">Aksi</th>
                    ) : (
                      <th className="p-3 font-medium min-w-[260px]">Pembinaan</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        tab === "sudah" && "align-top",
                        selected.has(r.id) && "bg-surface-2"
                      )}
                    >
                      {tab === "belum" && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            aria-label={`Pilih ${r.studentName}`}
                            className="w-4 h-4 accent-brand align-middle"
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="text-text-primary whitespace-nowrap">{r.studentName}</div>
                        <div className="text-xs text-text-secondary">{r.kelas}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-text-primary">{r.violation}</div>
                        {r.notes && <div className="text-xs text-text-muted max-w-[260px]">{r.notes}</div>}
                        <div className="text-[11px] text-text-muted">
                          Dicatat oleh {formatActor(r.createdByName, r.createdByRole)}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.severity && <Badge severity={r.severity}>{severityLabel(r.severity)}</Badge>}
                      </td>
                      <td className="p-3 whitespace-nowrap text-text-secondary">
                        {formatDate(r.dateAt)}
                        {r.timeAt ? ` · ${r.timeAt.slice(0, 5)}` : ""}
                        {tab === "belum" && (
                          <div>
                            <WaitingAge dateAt={r.dateAt} />
                          </div>
                        )}
                      </td>
                      {tab === "belum" ? (
                        <td className="p-3 text-right">
                          <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setModalIds([r.id])}>
                            <BookOpenCheck size={13} />
                            Bina
                          </Button>
                        </td>
                      ) : (
                        <td className="p-3">{renderFollowups(r)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            pageSize={FOLLOWUP_PAGE_SIZE}
            totalCount={data.totalCount}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </div>
      )}

      {/* Bar pilih massal -- nempel di bawah layar biar kejangkau jempol di HP. */}
      {tab === "belum" && selected.size > 0 && (
        <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 pt-2 bg-bg">
          <div className="flex items-center gap-3 flex-wrap rounded-xl bg-brand-tint text-brand-text px-4 py-2.5 text-sm font-medium">
            <span>{selected.size} pelanggaran dipilih</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs hover:underline">
              Batal pilih
            </button>
            <Button variant="primary" className="h-9" onClick={() => setModalIds(Array.from(selected))}>
              <BookOpenCheck size={14} />
              Catat pembinaan
            </Button>
          </div>
        </div>
      )}

      {modalIds && modalRows.length > 0 && (
        <FollowupModal
          rows={modalRows}
          options={followOptions}
          onClose={() => setModalIds(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-2 rounded-xl bg-text-primary text-bg px-4 py-3 text-sm shadow-lg"
        >
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}
