"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getClassesManagement,
  addClass,
  setClassActive,
  deleteClass,
  assignHomeroomTeacher,
  type ClassManagementRow,
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

  async function refresh() {
    setRefreshing(true);
    const data = await getClassesManagement();
    setClasses(data);
    setRefreshing(false);
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
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setShowAddForm((v) => !v)}>
          <Plus size={15} />
          Tambah kelas
        </Button>
      </div>

      {showAddForm && (
        <Card className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary">Nama kelas</label>
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder='misal "10 I"'
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>
          <Button variant="primary" onClick={handleAddClass} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
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
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  <Pencil size={12} />
                  {row.homeroomTeacherName ? row.homeroomTeacherName : "Atur wali kelas"}
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
              <div className="border-t border-border bg-surface-2 p-3 flex flex-col sm:flex-row gap-2.5 items-start sm:items-end">
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
