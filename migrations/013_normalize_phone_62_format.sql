-- Ganti standar dari "08" ke "62" -- aman dijalankan brapa pun kondisi
-- data sekarang (baik masih "08", masih campur strip/spasi, dst).

create or replace function pg_temp.normalize_phone_62(p text) returns text as $$
declare
  digits text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if digits like '0%' then
    return '62' || substring(digits from 2);
  elsif digits like '8%' then
    return '62' || digits;
  else
    return digits;
  end if;
end;
$$ language plpgsql;

update public.homeroom_teachers
set phone = pg_temp.normalize_phone_62(phone)
where phone is not null;

update public.staff
set username = pg_temp.normalize_phone_62(username)
where role = 'wali_kelas';

notify pgrst, 'reload schema';
