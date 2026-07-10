"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <ShieldCheck size={20} className="text-brand-on" />
          </div>
          <span className="font-display font-medium text-lg text-text-primary">
            SPS Ma&apos;ahid
          </span>
        </div>

        <form
          action={formAction}
          className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4"
        >
          <div>
            <h1 className="font-display font-medium text-lg text-text-primary mb-1">
              Masuk
            </h1>
            <p className="text-sm text-text-secondary">
              Sistem pelanggaran santri MA Ma&apos;ahid Kudus
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-xs font-medium text-text-secondary"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="nama.pengguna"
              className="h-10 rounded-lg border border-border bg-transparent px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-text-secondary"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-10 rounded-lg border border-border bg-transparent px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-berat" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={pending} className="mt-1">
            {pending ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
