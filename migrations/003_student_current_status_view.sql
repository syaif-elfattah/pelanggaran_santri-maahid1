-- Fase 2 - Manajemen Santri: view status terkini tiap santri.
-- Jalankan di SQL Editor Supabase. Aman dijalankan berkali-kali (create or replace).

create or replace view public.student_current_status as
select distinct on (se.student_id)
  se.student_id,
  s.name as student_name,
  se.class_id,
  c.kelas,
  se.academic_year_id,
  ay.label as academic_year_label,
  se.status
from public.student_enrollments se
join public.students s on s.id = se.student_id
join public.classes c on c.id = se.class_id
join public.academic_years ay on ay.id = se.academic_year_id
order by se.student_id, ay.start_date desc;

comment on view public.student_current_status is 'Status terbaru tiap santri (aktif/naik/lulus/keluar/pindah), dihitung dari enrollment paling akhir -- bukan kolom tersendiri biar nggak ada 2 sumber data yang bisa beda sendiri-sendiri';

grant select on public.student_current_status to service_role;

notify pgrst, 'reload schema';
