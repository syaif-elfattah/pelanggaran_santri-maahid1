-- Rapiin nomor HP wali kelas yang udah kesimpen -- disamain formatnya jadi
-- angka doang (tanpa strip/spasi), match persis sama username login-nya.
update public.homeroom_teachers
set phone = regexp_replace(phone, '[^0-9]', '', 'g')
where phone is not null;

notify pgrst, 'reload schema';
