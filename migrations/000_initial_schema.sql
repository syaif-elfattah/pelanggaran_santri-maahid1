-- 000_initial_schema.sql
-- Skema dasar yang di project MA dulu dibuat lewat proses restore data
-- di awal proyek -- BUKAN lewat migration bernomor manapun. Makanya
-- migrations/001 dst gagal kalau dijalankan ke database yang benar-benar
-- kosong (fresh project baru kayak MTs ini).
--
-- Jalankan file ini PALING PERTAMA di project baru, baru lanjut
-- 001_staff.sql, 002_academic_years_and_types.sql, dst berurutan seperti biasa.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  kelas text not null,
  name text not null,
  created_at timestamptz not null default now()
);
comment on table public.classes is 'Kelas/kelompok santri';

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references public.classes(id),
  created_at timestamptz not null default now()
);
comment on table public.students is 'Identitas dasar santri';

create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  violation text not null,
  time_at time,
  date_at date not null,
  notes text,
  created_at timestamptz not null default now()
);
comment on table public.violations is 'Catatan pelanggaran santri';

create table if not exists public.homeroom_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
comment on table public.homeroom_teachers is 'Wali kelas';

create index if not exists idx_students_class on public.students(class_id);
create index if not exists idx_violations_student on public.violations(student_id);
create index if not exists idx_violations_class on public.violations(class_id);
create index if not exists idx_homeroom_class on public.homeroom_teachers(class_id);

grant select, insert, update, delete on public.classes to service_role;
grant select, insert, update, delete on public.students to service_role;
grant select, insert, update, delete on public.violations to service_role;
grant select, insert, update, delete on public.homeroom_teachers to service_role;

-- Bucket storage buat file PDF laporan yang dikirim lewat WA (fitur
-- Kirim WA di Laporan). Tanpa ini, fitur itu bakal error pas dipakai nanti.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
