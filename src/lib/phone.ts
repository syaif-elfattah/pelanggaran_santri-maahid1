/**
 * Satu fungsi normalisasi nomor HP yang dipakai bareng di mana pun nomor
 * HP itu berperan sebagai username -- baik pas bikin akun (Manajemen
 * Kelas) maupun pas login. Selalu diseragamkan ke format "62..." (tanpa
 * strip/spasi/0 di depan), biar apa pun cara nomornya diketik, hasilnya
 * konsisten ke satu username yang sama.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}
