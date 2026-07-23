-- Index tambahan berdasarkan audit pola query yang beneran dipakai aplikasi.
-- Tanpa index ini, tiap filter = full scan seluruh tabel -- makin banyak
-- data makin lambat. Dengan index, waktunya hampir konstan.

-- Laporan: filter per kelas & per santri (dua pola paling sering)
create index if not exists idx_violations_class_date on public.violations(class_id, date_at desc);
create index if not exists idx_violations_student_date on public.violations(student_id, date_at desc);

-- Dashboard & laporan default: filter tahun ajaran + urut/rentang tanggal
create index if not exists idx_violations_year_date on public.violations(academic_year_id, date_at desc);

-- Manajemen Santri: view student_current_status pakai DISTINCT ON
-- (student_id ... order by start_date) -- index ini yang bikin
-- pengambilan "enrollment terakhir per santri" nggak perlu sort ulang
-- semua baris tiap kali.
create index if not exists idx_enrollments_student_year on public.student_enrollments(student_id, academic_year_id);

-- Pencarian nama santri (ilike '%...%') -- pg_trgm bikin pencarian
-- sebagian-kata tetap kepakai index, bukan scan semua nama.
create extension if not exists pg_trgm;
create index if not exists idx_students_name_trgm on public.students using gin (name gin_trgm_ops);

-- Login: pencarian staff by username (dipakai TIAP kali login)
create unique index if not exists idx_staff_username on public.staff(username);

-- Wali kelas: pencarian kelas ampuan by staff_id (dipakai tiap buka Laporan)
create index if not exists idx_homeroom_staff on public.homeroom_teachers(staff_id) where staff_id is not null;

notify pgrst, 'reload schema';
