"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, Check, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addFollowupType,
  renameFollowupType,
  deleteFollowupType,
  moveFollowupType,
  type FollowupType,
  type FollowupSuggestion,
  type FollowupTypesResult,
} from "@/lib/actions/followups";

const inputClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong";

/** Kelola pilihan bentuk pembinaan -- khusus admin. */
export function FollowupTypesCard({
  initialTypes,
  initialSuggestions,
}: {
  initialTypes: FollowupType[];
  initialSuggestions: FollowupSuggestion[];
}) {
  const [types, setTypes] = useState(initialTypes);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<FollowupTypesResult>, okText: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setTypes(result.types);
        const known = new Set(result.types.map((t) => t.label.toLowerCase()));
        setSuggestions((prev) => prev.filter((s) => !known.has(s.label.toLowerCase())));
        if (okText) setMessage({ kind: "ok", text: okText });
        after?.();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  function handleAdd(label: string) {
    const clean = label.trim();
    if (!clean) {
      setMessage({ kind: "error", text: "Tulis nama bentuk pembinaan dulu." });
      return;
    }
    run(() => addFollowupType(clean), `"${clean}" ditambahkan ke pilihan.`, () => setNewLabel(""));
  }

  function handleRename(id: string) {
    run(() => renameFollowupType(id, editLabel), "Nama diganti. Catatan lama tetap memakai nama lama.", () =>
      setEditingId(null)
    );
  }

  function handleDelete(type: FollowupType) {
    if (!confirm(`Hapus "${type.label}" dari pilihan? Catatan pembinaan lama yang memakainya tidak berubah.`)) return;
    run(() => deleteFollowupType(type.id), `"${type.label}" dihapus dari pilihan.`);
  }

  return (
    <Card className="max-w-lg flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BookOpenCheck size={16} className="text-text-secondary" />
        <h2 className="text-sm font-medium text-text-primary">Bentuk pembinaan</h2>
        {isPending && <Loader2 size={13} className="animate-spin text-text-muted" />}
      </div>
      <p className="text-xs text-text-secondary -mt-2">
        Pilihan yang muncul waktu mencatat pembinaan di Input per kelas, Input per santri, dan menu Pembinaan.
        Urutan di sini = urutan di pilihan.
      </p>

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd(newLabel);
            }
          }}
          placeholder="Bentuk baru, misal: Push up 20 kali"
          maxLength={80}
          className={`${inputClass} flex-1 min-w-0`}
        />
        <Button variant="primary" onClick={() => handleAdd(newLabel)} disabled={isPending}>
          <Plus size={14} />
          Tambah
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {types.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-2 py-1.5 border-b border-border min-h-12"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => run(() => moveFollowupType(t.id, "up"), "")}
                disabled={isPending || i === 0}
                aria-label={`Naikkan ${t.label}`}
                className="w-6 h-5 flex items-center justify-center rounded text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => run(() => moveFollowupType(t.id, "down"), "")}
                disabled={isPending || i === types.length - 1}
                aria-label={`Turunkan ${t.label}`}
                className="w-6 h-5 flex items-center justify-center rounded text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowDown size={12} />
              </button>
            </div>

            {editingId === t.id ? (
              <>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRename(t.id);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                  maxLength={80}
                  aria-label="Ganti nama"
                  className={`${inputClass} h-9 flex-1 min-w-0`}
                />
                <Button variant="secondary" className="h-9 px-3" onClick={() => setEditingId(null)} disabled={isPending}>
                  Batal
                </Button>
                <Button variant="primary" className="h-9 px-3" onClick={() => handleRename(t.id)} disabled={isPending}>
                  Simpan
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0 text-sm text-text-primary">{t.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(t.id);
                    setEditLabel(t.label);
                    setMessage(null);
                  }}
                  disabled={isPending}
                  aria-label={`Ganti nama ${t.label}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  disabled={isPending}
                  aria-label={`Hapus ${t.label}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-berat hover:bg-berat-tint"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2 text-sm text-text-secondary">
          <span className="flex-1">
            Lainnya... <span className="text-xs text-text-muted">· isian bebas, selalu di urutan terakhir</span>
          </span>
          <Lock size={13} className="text-text-muted" />
        </div>
      </div>

      <div className="text-xs" role="status">
        {message?.kind === "ok" && (
          <span className="flex items-center gap-1.5 text-brand-text">
            <Check size={14} /> {message.text}
          </span>
        )}
        {message?.kind === "error" && <span className="text-berat">{message.text}</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="border-t border-border pt-4 flex flex-col gap-2">
          <div>
            <p className="text-xs font-medium text-text-primary">Sering ditulis di &quot;Lainnya&quot;</p>
            <p className="text-[11px] text-text-muted">Jadikan pilihan tetap supaya petugas tidak perlu mengetik ulang.</p>
          </div>
          {suggestions.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{s.label}</div>
                <div className="text-[11px] text-text-muted">ditulis {s.count} kali</div>
              </div>
              <Button variant="secondary" className="h-8 px-3 text-xs shrink-0" onClick={() => handleAdd(s.label)} disabled={isPending}>
                <Plus size={12} />
                Jadikan pilihan
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
