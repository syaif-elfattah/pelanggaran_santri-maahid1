-- Perbaikan sekali jalan: data yang kemarin ke-label "2026/2027" pas migrasi
-- awal sebenarnya belum pernah dipromosikan -- itu masih kelas versi 2025/2026.
-- Script ini mindahin semua data itu balik ke label yang benar, baru "2026/2027"
-- yang lama dihapus, biar Naik Kelas bisa bikin "2026/2027" yang beneran baru.
-- JALANKAN SEKALI SAJA.

do $$
declare
  v_2025_id uuid;
  v_2026_id uuid;
begin
  select id into v_2025_id from public.academic_years where label = '2025/2026';
  select id into v_2026_id from public.academic_years where label = '2026/2027';

  if v_2025_id is null or v_2026_id is null then
    raise exception 'Salah satu tahun ajaran (2025/2026 atau 2026/2027) tidak ketemu -- cek dulu isi tabel academic_years sebelum lanjut';
  end if;

  update public.student_enrollments set academic_year_id = v_2025_id where academic_year_id = v_2026_id;
  update public.homeroom_teachers set academic_year_id = v_2025_id where academic_year_id = v_2026_id;
  update public.violations set academic_year_id = v_2025_id where academic_year_id = v_2026_id;

  update public.academic_years set is_active = true where id = v_2025_id;
  update public.academic_years set is_active = false where id = v_2026_id;

  delete from public.academic_years where id = v_2026_id;
end $$;

-- Verifikasi -- harusnya cuma 1 baris tersisa, "2025/2026", is_active = true
select label, is_active from public.academic_years;
