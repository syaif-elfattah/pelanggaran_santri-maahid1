-- Fase 1: tabel staff untuk login.
-- Jalankan ini di Supabase SQL Editor (project baru, lwbnkkluilxmwaaljntv).

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

comment on table public.staff is 'Akun login staf/musyrif untuk Sistem Pelanggaran Santri';

-- Service role (dipakai lewat getSupabaseServer()) butuh akses penuh,
-- sesuai pola yang sama dengan tabel-tabel lain.
grant select, insert, update, delete on public.staff to service_role;

notify pgrst, 'reload schema';

-- Akun awal -- password default: ganti-password-ini
-- WAJIB diganti manual (update hash di bawah) begitu bisa login,
-- fitur "ganti password" sendiri belum ada di Fase 1.
insert into public.staff (username, password_hash, name, role)
values (
  'admin',
  '$2b$10$OlxoSZOB3pVem9.98gN4dem4PRtVjUgfVteeABSGPWrBcMqdRkIV.',
  'Admin',
  'admin'
)
on conflict (username) do nothing;
