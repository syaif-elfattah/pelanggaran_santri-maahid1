/**
 * Konstanta pagination ditaruh di file tersendiri (BUKAN di file server
 * action) -- file ber-"use server" cuma boleh ngekspor fungsi async, dan
 * kalau ngekspor konstanta biasa, SELURUH ekspor file itu jadi nggak
 * kebaca sama build-nya.
 */
export const REPORT_PAGE_SIZE = 50;
export const STUDENT_PAGE_SIZE = 50;

// Batas aman buat export -- kalau hasil filter lebih dari ini, file-nya
// bakal kegedean & lama banget diproses. Mending user dipaksa mempersempit
// filternya daripada nunggu lama terus gagal.
export const EXPORT_MAX_ROWS = 2000;
export const STUDENT_EXPORT_MAX_ROWS = 5000;
