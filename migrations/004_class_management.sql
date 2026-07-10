-- Fase 2 - Manajemen Kelas & Wali Kelas.
-- Jalankan di SQL Editor Supabase. Aman dijalankan berkali-kali.

alter table public.classes add column if not exists is_active boolean not null default true;
comment on column public.classes.is_active is 'Kelas nonaktif tetap disimpan (histori laporan lama tetap utuh), cuma disembunyikan dari pilihan input baru & naik kelas';

-- Satu kelas cuma boleh 1 wali kelas per tahun ajaran.
alter table public.homeroom_teachers drop constraint if exists homeroom_teachers_class_year_unique;
alter table public.homeroom_teachers add constraint homeroom_teachers_class_year_unique unique (class_id, academic_year_id);

notify pgrst, 'reload schema';
