import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate } from "@/lib/dates";
import { formatInrForPdf } from "@/lib/money";

import {
  loanTypeLabel,
  type LoanStatementData,
} from "./loan-statement-types";

const colors = {
  paper: "#F8FAF9",
  primary: "#064E46",
  ink: "#17202A",
  muted: "#667085",
  border: "#DDE7E3",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  muted: { fontSize: 8, color: colors.muted },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tile: {
    width: "23%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: colors.white,
  },
  tileLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tileValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  sectionLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
  },
  colDate: { width: "14%" },
  colType: { width: "22%" },
  colDesc: { width: "36%" },
  colAmt: { width: "28%", textAlign: "right" },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
    marginBottom: 2,
  },
  headerCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function LoanStatementDocument({ data }: { data: LoanStatementData }) {
  const { balances, periodTotals, rows } = data;

  return (
    <Document
      title={`Home loan statement ${data.periodLabel}`}
      author="Kavin Illam"
      subject={`${data.projectName} — loan statement`}
      creator="Kavin Illam"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Kavin Illam</Text>
            <Text style={styles.muted}>Home loan statement</Text>
          </View>
          <View>
            <Text style={styles.title}>{data.periodLabel}</Text>
            <Text style={styles.muted}>{data.projectName}</Text>
            <Text style={styles.muted}>
              {data.lenderName || "Home Loan"} · Generated{" "}
              {formatDate(data.generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Wallet snapshot</Text>
        <View style={styles.grid}>
          {(
            [
              ["Sanctioned", balances.sanctioned],
              ["Disbursed", balances.disbursed],
              ["Construction", balances.spentConstruction],
              ["Available", balances.available],
              ["Diverted", balances.diverted],
              ["Repaid", balances.repaidRotational],
              ["Open rotational", balances.openRotational],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.tileLabel}>{label}</Text>
              <Text style={styles.tileValue}>{formatInrForPdf(value)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>This month</Text>
        <View style={styles.grid}>
          {(
            [
              ["Disbursed", periodTotals.disbursed],
              ["Construction", periodTotals.construction],
              ["Diverted", periodTotals.diverted],
              ["Repaid", periodTotals.repaid],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.tileLabel}>{label}</Text>
              <Text style={styles.tileValue}>{formatInrForPdf(value)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          Transactions ({rows.length})
        </Text>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
          <Text style={[styles.headerCell, styles.colType]}>Type</Text>
          <Text style={[styles.headerCell, styles.colDesc]}>Detail</Text>
          <Text style={[styles.headerCell, styles.colAmt]}>Amount</Text>
        </View>
        {rows.length === 0 ? (
          <Text style={styles.muted}>No loan movements in this month.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.loanNumber} style={styles.row} wrap={false}>
              <Text style={styles.colDate}>
                {formatDate(row.transactionDate)}
              </Text>
              <Text style={styles.colType}>{loanTypeLabel(row.type)}</Text>
              <Text style={styles.colDesc}>
                {[
                  row.loanNumber,
                  row.description || row.paidTo || null,
                  row.referenceNumber ? `Ref ${row.referenceNumber}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.colAmt}>{formatInrForPdf(row.amount)}</Text>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.muted}>
            Independent of construction Finance ledger · Asia/Kolkata
          </Text>
          <Text
            style={styles.muted}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
