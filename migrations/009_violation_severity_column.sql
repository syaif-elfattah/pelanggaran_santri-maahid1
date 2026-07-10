-- Perbaikan: severity langsung nempel di tiap baris pelanggaran, nggak cuma
-- lewat join ke violation_types -- soalnya entri "Lainnya" (custom, tanpa
-- violation_type_id) sebelumnya nggak punya severity sama sekali.

alter table public.violations add column if not exists severity text check (severity in ('ringan','sedang','berat'));

-- Backfill: data lama & yang udah pakai jenis preset, severity-nya disalin
-- dari violation_types biar konsisten satu sumber ke depannya.
update public.violations v
set severity = vt.severity
from public.violation_types vt
where v.violation_type_id = vt.id
  and v.severity is null;

notify pgrst, 'reload schema';
