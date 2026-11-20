-- 017_pembinaan.sql
-- Fitur: pembinaan setelah pelanggaran + pencatat pelanggaran.
--
-- Jalankan di SQL Editor Supabase SEBELUM kode versi baru di-push.
-- Semua perubahan di sini cuma NAMBAH (tabel/kolom/view/fungsi baru),
-- nggak ada yang dihapus -- aplikasi versi lama tetap jalan normal kalau
-- file ini dijalankan duluan. Aman dijalankan berkali-kali.

-- 1. Siapa yang mencatat pelanggaran. Nama & role disalin (snapshot) saat
--    input, biar tetap kebaca walau nama akunnya diganti belakangan.
--    Pelanggaran lama dibiarkan kosong (memang nggak ada datanya).
alter table public.violations add column if not exists created_by uuid references public.staff(id) on delete set null;
alter table public.violations add column if not exists created_by_name text;
alter table public.violations add column if not exists created_by_role text;

-- 2. Penanda "dilacak pembinaannya". Trik dua langkah: kolom dibuat dengan
--    default false -> SEMUA pelanggaran yang sudah ada otomatis jadi false
--    (= "Data lama", nggak masuk daftar tunggu). Habis itu default diganti
--    true -> setiap pelanggaran yang diinput SETELAH ini otomatis dilacak.
--    Dibungkus pengecekan biar kalau file ini dijalankan ulang, data yang
--    udah dilacak nggak ke-reset jadi false lagi.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'violations' and column_name = 'followup_tracked'
  ) then
    alter table public.violations add column followup_tracked boolean not null default false;
    alter table public.violations alter column followup_tracked set default true;
  end if;
end $$;

-- 3. Daftar bentuk pembinaan (dikelola admin dari menu Pengaturan).
--    Hapus = is_active false, bukan hapus baris -- catatan lama tetap utuh
--    karena nama bentuk disimpan sebagai teks di tiap catatan.
create table if not exists public.followup_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.followup_types is 'Pilihan bentuk pembinaan -- dikelola admin di Pengaturan';
create unique index if not exists idx_followup_types_label on public.followup_types (lower(label));

insert into public.followup_types (label, sort_order)
select x.label, x.ord
from (values
  ('Nasihat / teguran lisan', 1),
  ('Istighfar / dzikir', 2),
  ('Membaca Al-Qur''an', 3),
  ('Setoran hafalan', 4),
  ('Menulis surat pernyataan', 5),
  ('Membersihkan lingkungan', 6),
  ('Pemanggilan orang tua/wali', 7)
) as x(label, ord)
where not exists (select 1 from public.followup_types);

-- 4. Catatan pembinaan. Satu pelanggaran boleh punya lebih dari satu
--    catatan (misal teguran dulu, lalu pemanggilan orang tua).
--    is_direct = true kalau diisi langsung waktu input pelanggaran
--    (pembinanya = yang mencatat pelanggaran).
create table if not exists public.violation_followups (
  id uuid primary key default gen_random_uuid(),
  violation_id uuid not null references public.violations(id) on delete cascade,
  labels text[] not null check (cardinality(labels) > 0),
  done_at date not null,
  notes text,
  is_direct boolean not null default false,
  staff_id uuid references public.staff(id) on delete set null,
  staff_name text not null,
  staff_role text,
  created_at timestamptz not null default now()
);
comment on table public.violation_followups is 'Catatan pembinaan per pelanggaran';
create index if not exists idx_followups_violation on public.violation_followups(violation_id, done_at desc);
create index if not exists idx_violations_tracked on public.violations(date_at) where followup_tracked;

grant select, insert, update, delete on public.followup_types to service_role;
grant select, insert, update, delete on public.violation_followups to service_role;

-- 5. View Laporan: kolom lama TETAP di urutan yang sama (syarat
--    create or replace view), kolom baru ditambah di belakang.
--    followup_status: 'data_lama' | 'sudah' | 'belum'
--    followup_* = ringkasan catatan pembinaan TERAKHIR.
create or replace view public.violations_report as
select
  v.id,
  v.violation,
  v.date_at,
  v.time_at,
  v.notes,
  v.severity,
  case v.severity
    when 'ringan' then 1
    when 'sedang' then 2
    when 'berat' then 3
    else 0
  end as severity_rank,
  v.class_id,
  v.student_id,
  v.academic_year_id,
  s.name as student_name,
  c.kelas,
  v.followup_tracked,
  case
    when not v.followup_tracked then 'data_lama'
    when lf.id is not null then 'sudah'
    else 'belum'
  end as followup_status,
  lf.labels as followup_labels,
  lf.done_at as followup_done_at,
  lf.staff_name as followup_by,
  lf.staff_role as followup_by_role,
  lf.is_direct as followup_is_direct,
  v.created_by_name,
  v.created_by_role
from public.violations v
join public.students s on s.id = v.student_id
join public.classes c on c.id = v.class_id
left join lateral (
  select f.id, f.labels, f.done_at, f.staff_name, f.staff_role, f.is_direct
  from public.violation_followups f
  where f.violation_id = v.id
  order by f.done_at desc, f.created_at desc
  limit 1
) lf on true;

grant select on public.violations_report to service_role;

-- 6. Hitungan "belum dibina" buat angka di menu samping & Dashboard --
--    dipanggil di tiap halaman, jadi sengaja query paling ringan
--    (langsung ke tabel, bukan lewat view).
create or replace function public.count_pending_followups()
returns bigint
language sql
stable
as $$
  select count(*)
  from public.violations v
  where v.followup_tracked
    and not exists (select 1 from public.violation_followups f where f.violation_id = v.id);
$$;

grant execute on function public.count_pending_followups() to service_role;

notify pgrst, 'reload schema';
