-- View pipih buat Laporan: gabungin violations + nama santri + nama kelas
-- jadi satu "tabel" datar. Ini yang bikin pagination, pengurutan, dan
-- penghitungan total bisa dilakuin SEPENUHNYA di database -- nggak perlu
-- narik semua baris ke aplikasi dulu baru diurutin/dipotong di sana.
--
-- severity_rank: biar pengurutan tingkat pelanggaran ikut urutan yang
-- masuk akal (ringan -> sedang -> berat), bukan alfabetis (berat, ringan,
-- sedang) yang bakal terjadi kalau ngurutin kolom teks 'severity' langsung.

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
  c.kelas
from public.violations v
join public.students s on s.id = v.student_id
join public.classes c on c.id = v.class_id;

grant select on public.violations_report to service_role;

notify pgrst, 'reload schema';
