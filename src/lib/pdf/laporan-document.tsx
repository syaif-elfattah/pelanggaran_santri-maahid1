import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportRow } from "@/lib/actions/reports";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 10 },
  meta: { fontSize: 9, color: "#555", marginBottom: 2 },
  table: { marginTop: 12, borderWidth: 0.5, borderColor: "#ccc" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ccc" },
  headerRow: { flexDirection: "row", backgroundColor: "#eee", fontWeight: 700 },
  cell: { padding: 5, borderRightWidth: 0.5, borderColor: "#ccc" },
  cNo: { width: "5%" },
  cNama: { width: "20%" },
  cKelas: { width: "10%" },
  cPelanggaran: { width: "23%" },
  cTingkat: { width: "10%" },
  cTanggal: { width: "12%" },
  cKeterangan: { width: "20%", borderRightWidth: 0 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 8, color: "#999" },
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

export function LaporanDocument({
  rows,
  scopeLabel,
  periodLabel,
}: {
  rows: ReportRow[];
  scopeLabel: string;
  periodLabel: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Laporan Pelanggaran Santri</Text>
        <Text style={styles.subtitle}>MA Ma&apos;ahid Kudus</Text>
        <Text style={styles.meta}>Cakupan: {scopeLabel}</Text>
        <Text style={styles.meta}>Periode: {periodLabel}</Text>
        <Text style={styles.meta}>
          Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.cNo]}>No</Text>
            <Text style={[styles.cell, styles.cNama]}>Nama Santri</Text>
            <Text style={[styles.cell, styles.cKelas]}>Kelas</Text>
            <Text style={[styles.cell, styles.cPelanggaran]}>Pelanggaran</Text>
            <Text style={[styles.cell, styles.cTingkat]}>Tingkat</Text>
            <Text style={[styles.cell, styles.cTanggal]}>Tanggal</Text>
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
