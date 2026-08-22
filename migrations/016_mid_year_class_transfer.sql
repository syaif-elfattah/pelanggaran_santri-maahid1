-- Fitur: pindah kelas di tengah tahun ajaran (bukan lewat proses Naik
-- Kelas tahunan). Berlaku sama di project MA maupun MTs -- keduanya
-- struktur skemanya identik.

-- Longgarin batasan unik: dari "1 baris per santri per tahun ajaran"
-- jadi "1 baris per santri per tahun ajaran per KELAS" -- biar pindah
-- kelas bisa bikin baris baru (bukan nimpa), riwayatnya tetap kebaca.
-- Nama constraint lama dicari otomatis (bukan ditebak), biar aman
-- kalau ternyata beda dari yang diperkirakan.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.student_enrollments'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like '%student_id%academic_year_id%'
    and pg_get_constraintdef(oid) not like '%class_id%';

  if v_constraint_name is not null then
    execute format('alter table public.student_enrollments drop constraint %I', v_constraint_name);
  end if;
end $$;

do $$
begin
  alter table public.student_enrollments add constraint student_enrollments_student_year_class_key
    unique (student_id, academic_year_id, class_id);
exception
  when duplicate_table then null; -- constraint udah ada, aman dilewatin
end $$;

-- View status terkini: sekarang perlu tie-breaker kedua (created_at)
-- buat nentuin baris mana yang "paling akhir" kalau ada lebih dari 1
-- baris di tahun ajaran yang sama (kasus pindah kelas).
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
order by se.student_id, ay.start_date desc, se.created_at desc;

notify pgrst, 'reload schema';
