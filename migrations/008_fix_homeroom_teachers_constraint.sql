-- Perbaikan: cabut aturan unique lama di homeroom_teachers.class_id (sisa
-- sebelum ada konsep tahun ajaran). Aturan yang benar sekarang sudah ada
-- di migration 004: unique(class_id, academic_year_id) -- itu tetap dipakai,
-- cuma yang versi lama (per class_id doang, tanpa tahun) dihapus.

alter table public.homeroom_teachers drop constraint if exists homeroom_teachers_class_id_key;

notify pgrst, 'reload schema';
