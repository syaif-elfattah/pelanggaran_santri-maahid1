-- Fase 2 - Naik Kelas: fungsi database buat eksekusi promosi tahunan
-- secara atomic (semua berhasil, atau semua batal -- nggak ada tengah-tengah).
-- Jalankan di SQL Editor Supabase. Aman dijalankan berkali-kali (create or replace).

create or replace function public.promote_academic_year(
  p_new_year_label text,
  p_new_year_start date,
  p_new_year_end date,
  p_mappings jsonb -- array: [{"from_class_id": "...", "to_class_id": "..."|null, "action": "naik"|"lulus"}]
) returns uuid
language plpgsql
as $$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_mapping jsonb;
  v_from_class_id uuid;
  v_to_class_id uuid;
  v_action text;
begin
  select id into v_old_year_id from public.academic_years where is_active = true limit 1;
  if v_old_year_id is null then
    raise exception 'Tidak ada tahun ajaran aktif saat ini';
  end if;

  if exists (select 1 from public.academic_years where label = p_new_year_label) then
    raise exception 'Tahun ajaran % sudah ada -- kemungkinan proses ini sudah pernah dijalankan', p_new_year_label;
  end if;

  insert into public.academic_years (label, start_date, end_date, is_active)
  values (p_new_year_label, p_new_year_start, p_new_year_end, false)
  returning id into v_new_year_id;

  for v_mapping in select * from jsonb_array_elements(p_mappings)
  loop
    v_from_class_id := (v_mapping->>'from_class_id')::uuid;
    v_action := v_mapping->>'action';

    if v_action = 'lulus' then
      update public.student_enrollments
      set status = 'lulus'
      where class_id = v_from_class_id
        and academic_year_id = v_old_year_id
        and status = 'aktif';
    else
      v_to_class_id := (v_mapping->>'to_class_id')::uuid;
      if v_to_class_id is null then
        raise exception 'Kelas tujuan belum dipilih buat salah satu baris mapping';
      end if;

      insert into public.student_enrollments (student_id, class_id, academic_year_id, status)
      select student_id, v_to_class_id, v_new_year_id, 'aktif'
      from public.student_enrollments
      where class_id = v_from_class_id
        and academic_year_id = v_old_year_id
        and status = 'aktif';

      update public.student_enrollments
      set status = 'naik'
      where class_id = v_from_class_id
        and academic_year_id = v_old_year_id
        and status = 'aktif';
    end if;
  end loop;

  -- Sinkronin cache students.class_id buat yang aktif di tahun baru.
  update public.students s
  set class_id = se.class_id
  from public.student_enrollments se
  where se.student_id = s.id
    and se.academic_year_id = v_new_year_id
    and se.status = 'aktif';

  update public.academic_years set is_active = false where id = v_old_year_id;
  update public.academic_years set is_active = true where id = v_new_year_id;

  return v_new_year_id;
end;
$$;

grant execute on function public.promote_academic_year(text, date, date, jsonb) to service_role;

notify pgrst, 'reload schema';
