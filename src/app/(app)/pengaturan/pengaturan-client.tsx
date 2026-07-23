"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateAccount } from "@/lib/actions/account";
import { updateGuruAccount } from "@/lib/actions/guru-account";

export function PengaturanClient({
  currentUsername,
  currentName,
  isAdmin,
  guruUsername,
}: {
  currentUsername: string;
  currentName: string;
  isAdmin: boolean;
  guruUsername: string | null;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [name, setName] = useState(currentName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [state, setState] = useState<
    { status: "idle" } | { status: "success" } | { status: "error"; message: string }
  >({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  const [guruUsernameInput, setGuruUsernameInput] = useState(guruUsername ?? "");
  const [guruPassword, setGuruPassword] = useState("");
  const [guruState, setGuruState] = useState<
    { status: "idle" } | { status: "success" } | { status: "error"; message: string }
  >({ status: "idle" });
  const [isSavingGuru, startSavingGuru] = useTransition();

  function handleSubmit() {
    if (newPassword && newPassword !== confirmPassword) {
      setState({ status: "error", message: "Konfirmasi password baru tidak cocok." });
      return;
    }

    startSaving(async () => {
      const result = await updateAccount(currentPassword, username, name, newPassword);
      if (result.success) {
        setState({ status: "success" });
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
      } else {
        setState({ status: "error", message: result.error });
      }
    });
  }

  function handleSubmitGuru() {
    startSavingGuru(async () => {
      const result = await updateGuruAccount(guruUsernameInput, guruPassword);
      if (result.success) {
        setGuruState({ status: "success" });
        setGuruPassword("");
      } else {
        setGuruState({ status: "error", message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-lg flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-text-secondary" />
          <h2 className="text-sm font-medium text-text-primary">Profil & keamanan</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Nama tampilan</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            Kosongkan kalau nggak mau ganti password.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Password baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Konfirmasi password baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-border-strong"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">
            Password saat ini <span className="text-berat">*</span>
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Wajib diisi buat konfirmasi perubahan"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs" role="status">
            {state.status === "success" && (
              <span className="flex items-center gap-1.5 text-brand-text">
                <Check size={14} /> Perubahan tersimpan.
              </span>
            )}
            {state.status === "error" && <span className="text-berat">{state.message}</span>}
          </div>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSaving || !currentPassword}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Menyimpan...
              </span>
            ) : (
              "Simpan perubahan"
            )}
          </Button>
        </div>
      </Card>

      {isAdmin && (
        <Card className="max-w-lg flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-secondary" />
            <h2 className="text-sm font-medium text-text-primary">Akun guru bersama</h2>
          </div>
          <p className="text-xs text-text-secondary -mt-2">
            Satu akun ini dipakai bareng sama semua guru buat input pelanggaran -- nggak ada laporan
            atau menu manajemen yang bisa diakses lewat akun ini.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Username</label>
              <input
                value={guruUsernameInput}
                onChange={(e) => setGuruUsernameInput(e.target.value)}
                placeholder="misal: guru"
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Password {guruUsername ? "baru" : ""}
              </label>
              <input
                type="password"
                value={guruPassword}
                onChange={(e) => setGuruPassword(e.target.value)}
                placeholder={guruUsername ? "Kosongkan kalau nggak ganti" : "Wajib diisi (akun baru)"}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs" role="status">
              {guruState.status === "success" && (
                <span className="flex items-center gap-1.5 text-brand-text">
                  <Check size={14} /> {guruUsername ? "Akun guru tersimpan." : "Akun guru dibuat."}
                </span>
              )}
              {guruState.status === "error" && <span className="text-berat">{guruState.message}</span>}
            </div>
            <Button variant="primary" onClick={handleSubmitGuru} disabled={isSavingGuru} className="w-full sm:w-auto">
              {isSavingGuru ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Menyimpan...
                </span>
              ) : guruUsername ? (
                "Simpan perubahan"
              ) : (
                "Buat akun guru"
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
