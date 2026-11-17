import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrForPdf } from "@/lib/money";

import {
  loanReceiptTitle,
  type LoanReceiptData,
} from "./loan-receipt-types";

const colors = {
  paper: "#F8FAF9",
  primary: "#064E46",
  ink: "#17202A",
  muted: "#667085",
  border: "#DDE7E3",
  white: "#FFFFFF",
  amberBg: "#FFFBF2",
  amberBorder: "#EAD9B4",
  emeraldBg: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  brandTag: {
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 1.2,
    marginTop: 2,
    textTransform: "uppercase",
  },
  docTitle: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    textAlign: "right",
  },
  receiptId: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  amountBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  amountValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginTop: 6,
  },
  amountMeta: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F0",
  },
  rowLabel: { fontSize: 9, color: colors.muted, width: "40%" },
  rowValue: { fontSize: 9, color: colors.ink, width: "58%", textAlign: "right" },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: colors.muted, lineHeight: 1.4 },
  proofList: {
    marginTop: 4,
    gap: 6,
  },
  proofBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: colors.white,
  },
  proofNameLink: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    textDecoration: "none",
  },
  proofMeta: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  proofLink: {
    fontSize: 8,
    color: colors.primary,
    marginTop: 4,
    textDecoration: "underline",
  },
});

export function LoanReceiptDocument({ data }: { data: LoanReceiptData }) {
  const { transaction, projectName, lenderName, sanctionedAmount, generatedAt } =
    data;
  const amountLabel = formatInrForPdf(transaction.amount);

  return (
    <Document
      title={`${loanReceiptTitle(transaction.type)} ${transaction.loanNumber}`}
      author="Kavin Illam"
      subject={`${projectName} — ${transaction.loanNumber}`}
      creator="Kavin Illam"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>Kavin Illam</Text>
            <Text style={styles.brandTag}>Home loan · Build · Track · Manage</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>
              {loanReceiptTitle(transaction.type)}
            </Text>
            <Text style={styles.receiptId}>{transaction.loanNumber}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Project</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
          {projectName}
        </Text>
        <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 12 }}>
          {lenderName || "Home Loan"} · Sanctioned{" "}
          {formatInrForPdf(sanctionedAmount)}
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <Text style={styles.amountValue}>{amountLabel}</Text>
          <Text style={styles.amountMeta}>
            {transaction.currency} · {formatDate(transaction.transactionDate)}
          </Text>
          {transaction.rotationalStatus ? (
            <Text style={styles.amountMeta}>
              Status: {transaction.rotationalStatus.replaceAll("_", " ")}
            </Text>
          ) : null}
        </View>

        {transaction.type === "DEBIT_OTHER" ? (
          <View
            style={[
              styles.panel,
              {
                borderColor: colors.amberBorder,
                backgroundColor: colors.amberBg,
              },
            ]}
          >
            <Text style={styles.sectionLabel}>Rotational progress</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>
              {formatInrForPdf(transaction.repaid ?? 0)} repaid ·{" "}
              {formatInrForPdf(transaction.outstanding ?? 0)} open
            </Text>
            {(transaction.repayments ?? []).map((row) => (
              <Text key={row.loanNumber} style={{ fontSize: 9, color: colors.muted }}>
                {row.loanNumber} · {formatDate(row.transactionDate)} ·{" "}
                {formatInrForPdf(row.amount)}
              </Text>
            ))}
          </View>
        ) : null}

        {transaction.type === "CREDIT_REPAYMENT" && transaction.linkedDebit ? (
          <View
            style={[
              styles.panel,
              {
                borderColor: colors.emeraldBorder,
                backgroundColor: colors.emeraldBg,
              },
            ]}
          >
            <Text style={styles.sectionLabel}>Linked diversion</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
              {transaction.linkedDebit.loanNumber} ·{" "}
              {formatInrForPdf(transaction.linkedDebit.amount)}
            </Text>
            {transaction.linkedDebit.description ? (
              <Text style={{ fontSize: 9, color: colors.muted, marginTop: 3 }}>
                {transaction.linkedDebit.description}
              </Text>
            ) : null}
            <Text style={{ fontSize: 9, marginTop: 4 }}>
              Remaining open: {formatInrForPdf(transaction.outstanding ?? 0)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Type</Text>
          <Text style={styles.rowValue}>
            {loanReceiptTitle(transaction.type)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Paid to / from</Text>
          <Text style={styles.rowValue}>{transaction.paidTo || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Method</Text>
          <Text style={styles.rowValue}>
            {transaction.paymentMethod?.replaceAll("_", " ") || "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reference</Text>
          <Text style={styles.rowValue}>
            {transaction.referenceNumber || "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Recorded by</Text>
          <Text style={styles.rowValue}>{transaction.recordedBy}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Recorded at</Text>
          <Text style={styles.rowValue}>
            {formatDateTime(transaction.createdAt)}
          </Text>
        </View>

        {transaction.description ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text>{transaction.description}</Text>
          </View>
        ) : null}

        {transaction.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={{ color: colors.muted }}>{transaction.notes}</Text>
          </View>
        ) : null}

        {(transaction.proofDocuments ?? []).length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>
              Payment screenshot
              {(transaction.proofDocuments ?? []).length > 1 ? "s" : ""}
            </Text>
            <View style={styles.proofList}>
              {(transaction.proofDocuments ?? []).map((doc, index) => {
                const proofs = transaction.proofDocuments ?? [];
                const label = `${proofs.length > 1 ? `${index + 1}. ` : ""}${doc.fileName}`;
                return (
                  <View key={doc.id} style={styles.proofBox} wrap={false}>
                    {doc.href ? (
                      <Link src={doc.href} style={styles.proofNameLink}>
                        {label}
                      </Link>
                    ) : (
                      <Text style={styles.proofNameLink}>{label}</Text>
                    )}
                    <Text style={styles.proofMeta}>
                      {[doc.title, doc.documentNumber, doc.mimeType]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {doc.href ? (
                      <Link src={doc.href} style={styles.proofLink}>
                        Open in portal
                      </Link>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>Kavin Illam · Home loan</Text>
            <Text style={styles.footerText}>
              Receipt ID: {transaction.loanNumber}
            </Text>
            <Text style={styles.footerText}>
              Generated {formatDate(generatedAt)} · Independent of construction
              Finance ledger.
            </Text>
          </View>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
