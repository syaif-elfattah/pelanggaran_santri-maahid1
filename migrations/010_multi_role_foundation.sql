-- Fase multi-role, Tahap A: fondasi skema.
-- Jalankan di SQL Editor Supabase.

alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (role in ('admin', 'wali_kelas', 'guru'));
alter table public.staff alter column role set default 'guru';

alter table public.homeroom_teachers add column if not exists staff_id uuid references public.staff(id);

notify pgrst, 'reload schema';
