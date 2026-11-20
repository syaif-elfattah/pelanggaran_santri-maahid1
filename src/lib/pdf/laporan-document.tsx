import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportRow } from "@/lib/actions/reports";
import { formatActor } from "@/lib/followups";

// Landscape -- kolom Pencatat & Pembinaan nggak muat kalau tetap portrait.
const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 10 },
  meta: { fontSize: 9, color: "#555", marginBottom: 2 },
  table: { marginTop: 12, borderWidth: 0.5, borderColor: "#ccc" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ccc" },
  headerRow: { flexDirection: "row", backgroundColor: "#eee", fontWeight: 700 },
  cell: { padding: 4, borderRightWidth: 0.5, borderColor: "#ccc" },
  cNo: { width: "4%" },
  cNama: { width: "15%" },
  cKelas: { width: "7%" },
  cPelanggaran: { width: "15%" },
  cTingkat: { width: "7%" },
  cTanggal: { width: "9%" },
  cPencatat: { width: "11%" },
  cPembinaan: { width: "18%" },
  cKeterangan: { width: "14%", borderRightWidth: 0 },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 8, color: "#999" },
});

function severityLabel(s: ReportRow["severity"]) {
  if (s === "ringan") return "Ringan";
  if (s === "sedang") return "Sedang";
  if (s === "berat") return "Berat";
  return "-";
}

function formatDate(dateAt: string) {
  return new Date(dateAt + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function followupText(r: ReportRow) {
  // Data lama dari sebelum update tetap dikirim tanpa info pembinaan.
  if (r.followupStatus === "data_lama" || !r.followupStatus) return "-";
  if (r.followupStatus === "belum") return "Belum dibina";
  const labels = (r.followupLabels ?? []).join(", ");
  const when = r.followupDoneAt ? ` (${formatDate(r.followupDoneAt)})` : "";
  const by = r.followupBy ? `\noleh ${formatActor(r.followupBy, r.followupByRole)}` : "";
  return `${labels}${when}${by}`;
}

export function LaporanDocument({
  rows,
  scopeLabel,
  periodLabel,
}: {
  rows: ReportRow[];
  scopeLabel: string;
  periodLabel: string;
}) {
  const sudah = rows.filter((r) => r.followupStatus === "sudah").length;
  const belum = rows.filter((r) => r.followupStatus === "belum").length;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Laporan Pelanggaran Santri</Text>
        <Text style={styles.subtitle}>MA Ma&apos;ahid Kudus</Text>
        <Text style={styles.meta}>Cakupan: {scopeLabel}</Text>
        <Text style={styles.meta}>Periode: {periodLabel}</Text>
        {sudah + belum > 0 && (
          <Text style={styles.meta}>
            Pembinaan: {sudah} sudah dibina, {belum} belum dibina
          </Text>
        )}
        <Text style={styles.meta}>
          Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow} fixed>
            <Text style={[styles.cell, styles.cNo]}>No</Text>
            <Text style={[styles.cell, styles.cNama]}>Nama Santri</Text>
            <Text style={[styles.cell, styles.cKelas]}>Kelas</Text>
            <Text style={[styles.cell, styles.cPelanggaran]}>Pelanggaran</Text>
            <Text style={[styles.cell, styles.cTingkat]}>Tingkat</Text>
            <Text style={[styles.cell, styles.cTanggal]}>Tanggal</Text>
            <Text style={[styles.cell, styles.cPencatat]}>Dicatat oleh</Text>
            <Text style={[styles.cell, styles.cPembinaan]}>Pembinaan</Text>
            <Text style={[styles.cell, styles.cKeterangan]}>Keterangan</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.cNo]}>{i + 1}</Text>
              <Text style={[styles.cell, styles.cNama]}>{r.studentName}</Text>
              <Text style={[styles.cell, styles.cKelas]}>{r.kelas}</Text>
              <Text style={[styles.cell, styles.cPelanggaran]}>{r.violation}</Text>
              <Text style={[styles.cell, styles.cTingkat]}>{severityLabel(r.severity)}</Text>
              <Text style={[styles.cell, styles.cTanggal]}>{formatDate(r.dateAt)}</Text>
              <Text style={[styles.cell, styles.cPencatat]}>{formatActor(r.createdByName, r.createdByRole)}</Text>
              <Text style={[styles.cell, styles.cPembinaan]}>{followupText(r)}</Text>
              <Text style={[styles.cell, styles.cKeterangan]}>{r.notes ?? "-"}</Text>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages} -- Total ${rows.length} pelanggaran`}
          fixed
        />
      </Page>
    </Document>
  );
}
