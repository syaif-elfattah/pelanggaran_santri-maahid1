-- Samain semua nomor HP (yang ditulis "62..." atau "8..." tanpa 0 di depan)
-- jadi format "08..." yang konsisten -- berlaku buat nomor yang ditampilin
-- MAUPUN username login-nya, biar dua-duanya selalu sama persis.

create or replace function pg_temp.normalize_phone_08(p text) returns text as $$
declare
  digits text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if digits like '62%' then
    return '0' || substring(digits from 3);
  elsif digits like '8%' then
    return '0' || digits;
  else
    return digits;
  end if;
end;
$$ language plpgsql;

update public.homeroom_teachers
set phone = pg_temp.normalize_phone_08(phone)
where phone is not null;

update public.staff
set username = pg_temp.normalize_phone_08(username)
where role = 'wali_kelas';

notify pgrst, 'reload schema';
