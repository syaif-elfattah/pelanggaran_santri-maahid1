-- Fase 2 - langkah 1: skema tahun ajaran + jenis pelanggaran.
-- Jalankan ini SETELAH migrations/001_staff.sql, di SQL Editor Supabase
-- project baru (lwbnkkluilxmwaaljntv). Aman dijalankan berkali-kali.

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.academic_years is 'Tahun ajaran, mis. 2026/2027';

create table if not exists public.violation_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  severity text not null check (severity in ('ringan','sedang','berat')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.violation_types is 'Jenis pelanggaran terkelola -- pengganti dropdown hardcoded di app lama';

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  status text not null default 'aktif' check (status in ('aktif','naik','lulus','keluar','pindah')),
  created_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);
comment on table public.student_enrollments is 'Riwayat penempatan kelas santri per tahun ajaran';

alter table public.violations add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.violations add column if not exists violation_type_id uuid references public.violation_types(id);
alter table public.homeroom_teachers add column if not exists academic_year_id uuid references public.academic_years(id);

create index if not exists idx_enrollments_class_year on public.student_enrollments(class_id, academic_year_id);
create index if not exists idx_enrollments_student on public.student_enrollments(student_id);
create index if not exists idx_violations_academic_year on public.violations(academic_year_id);

grant select, insert, update, delete on public.academic_years to service_role;
grant select, insert, update, delete on public.violation_types to service_role;
grant select, insert, update, delete on public.student_enrollments to service_role;

notify pgrst, 'reload schema';

-- Seed 4 jenis pelanggaran yang sudah ada di app lama (severity ditentukan
-- masuk akal berdasarkan sifatnya -- boleh diedit langsung lewat tabel ini
-- kapan saja, termasuk nambah kategori "berat" yang belum ada sama sekali
-- di app lama).
insert into public.violation_types (label, severity) values
  ('Terlambat', 'ringan'),
  ('Atribut tidak lengkap', 'ringan'),
  ('Tidak mengikuti pelajaran', 'sedang'),
  ('Terlambat mengikuti pelajaran', 'ringan')
on conflict (label) do nothing;

-- Tahun ajaran: 2025/2026 buat nampung histori 1108 pelanggaran yang sudah
-- ada (semuanya tercatat sesudah Nov 2025), dan 2026/2027 sebagai tahun aktif
-- sekarang.
insert into public.academic_years (label, start_date, end_date, is_active) values
  ('2025/2026', '2025-07-01', '2026-06-30', false),
  ('2026/2027', '2026-07-01', '2027-06-30', true)
on conflict (label) do nothing;

-- Backfill: pelanggaran lama dipetakan ke tahun ajaran berdasarkan tanggal kejadian.
update public.violations v
set academic_year_id = ay.id
from public.academic_years ay
where v.academic_year_id is null
  and v.date_at between ay.start_date and ay.end_date;

-- Backfill: cocokkan teks pelanggaran lama ke jenis pelanggaran baru kalau persis sama.
-- Yang tidak cocok (isian bebas "Lainnya") dibiarkan null -- itu memang benar, bukan bug.
update public.violations v
set violation_type_id = vt.id
from public.violation_types vt
where v.violation_type_id is null
  and v.violation = vt.label;

-- Backfill: 619 santri didaftarkan ke tahun ajaran aktif sesuai kelas mereka sekarang.
insert into public.student_enrollments (student_id, class_id, academic_year_id, status)
select s.id, s.class_id, ay.id, 'aktif'
from public.students s
cross join (select id from public.academic_years where is_active) ay
where s.class_id is not null
on conflict (student_id, academic_year_id) do nothing;

-- Backfill: wali kelas yang sudah ada dianggap berlaku di tahun ajaran aktif.
update public.homeroom_teachers ht
set academic_year_id = ay.id
from (select id from public.academic_years where is_active) ay
where ht.academic_year_id is null;
