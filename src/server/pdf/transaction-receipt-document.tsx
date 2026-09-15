import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";

import {
  amountSectionLabel,
  methodDisplayLabel,
  receiptKindLabel,
  statusBadgeColors,
  typeAccentColor,
  typeDisplayLabel,
  type TransactionReceiptData,
} from "./transaction-receipt-types";

const colors = {
  paper: "#F8FAF9",
  primary: "#064E46",
  accent: "#00A86B",
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
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  accentBar: {
    height: 3,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  monogram: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: {
    color: "#5EEAD4",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  brandTag: {
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 1.4,
    marginTop: 2,
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  receiptId: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  badge: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  projectName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  projectType: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  amountBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: colors.muted,
    textTransform: "uppercase",
  },
  amountValue: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginTop: 6,
  },
  amountMeta: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 6,
  },
  twoCol: {
    flexDirection: "row",
    gap: 24,
    marginTop: 4,
  },
  col: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F0",
  },
  rowLabel: {
    fontSize: 9,
    color: colors.muted,
    width: "42%",
  },
  rowValue: {
    fontSize: 9,
    color: colors.ink,
    width: "58%",
    textAlign: "right",
  },
  paidToValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
    marginBottom: 4,
  },
  descriptionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    backgroundColor: colors.white,
  },
  descriptionText: {
    fontSize: 10,
    color: colors.ink,
    lineHeight: 1.45,
  },
  proofBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    backgroundColor: colors.white,
  },
  proofName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  proofMeta: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
    lineHeight: 1.4,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.muted,
  },
  block: {
    marginBottom: 14,
  },
});

function partyLabel(party?: ReceiptPartyLike): string {
  return party?.name || party?.email || "—";
}

type ReceiptPartyLike = {
  name?: string | null;
  email?: string | null;
};

/**
 * Standalone A4 receipt for PDF generation only.
 * Must never include application chrome.
 */
export function TransactionReceiptDocument({
  data,
}: {
  data: TransactionReceiptData;
}) {
  const { transaction, projectName, projectType, generatedAt } = data;
  const amountLabel = formatInrFromPaise(transaction.amount);
  const accent = typeAccentColor(transaction.type);
  const badge = statusBadgeColors(transaction.status);
  const recordedBy = partyLabel(
    transaction.paidBy ?? transaction.createdBy,
  );

  return (
    <Document
      title={`${receiptKindLabel(transaction.type)} ${transaction.transactionNumber}`}
      author="Kavin Illam"
      subject={`${projectName} — ${transaction.transactionNumber}`}
      creator="Kavin Illam"
    >
      <Page size="A4" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>KI</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Kavin Illam</Text>
              <Text style={styles.brandTag}>Build · Track · Manage</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>
              {receiptKindLabel(transaction.type)}
            </Text>
            <Text style={styles.receiptId}>
              {transaction.transactionNumber}
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: badge.bg,
                  borderColor: badge.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {transaction.status.replaceAll("_", " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.block}>
          <Text style={styles.sectionLabel}>Project</Text>
          <Text style={styles.projectName}>{projectName}</Text>
          <Text style={styles.projectType}>
            {projectType.replaceAll("_", " ")} construction
          </Text>
        </View>

        <View style={[styles.block, styles.amountBox]}>
          <Text style={styles.amountLabel}>
            {amountSectionLabel(transaction.type)}
          </Text>
          <Text style={styles.amountValue}>{amountLabel}</Text>
          <Text style={styles.amountMeta}>
            {transaction.currency} · {formatDate(transaction.transactionDate)}
          </Text>
        </View>

        <View style={[styles.block, styles.twoCol]}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Transaction</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Receipt ID</Text>
              <Text style={styles.rowValue}>
                {transaction.transactionNumber}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Type</Text>
              <Text style={styles.rowValue}>
                {typeDisplayLabel(transaction.type)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Category</Text>
              <Text style={styles.rowValue}>
                {transaction.categoryName || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Account</Text>
              <Text style={styles.rowValue}>
                {transaction.accountName || "—"}
              </Text>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Payment</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Amount</Text>
              <Text style={styles.rowValue}>{amountLabel}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Method</Text>
              <Text style={styles.rowValue}>
                {methodDisplayLabel(transaction.paymentMethod)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Reference / UTR</Text>
              <Text style={styles.rowValue}>
                {transaction.referenceNumber || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Recorded by</Text>
              <Text style={styles.rowValue}>{recordedBy}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Recorded at</Text>
              <Text style={styles.rowValue}>
                {formatDateTime(transaction.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {transaction.paidTo ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Paid to</Text>
            <Text style={styles.paidToValue}>{transaction.paidTo}</Text>
            <Text style={styles.projectType}>Project: {projectName}</Text>
          </View>
        ) : null}

        {transaction.description ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Description</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>
                {transaction.description}
              </Text>
            </View>
          </View>
        ) : null}

        {transaction.notes ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{transaction.notes}</Text>
            </View>
          </View>
        ) : null}

        {(() => {
          const proofs =
            transaction.proofDocuments && transaction.proofDocuments.length > 0
              ? transaction.proofDocuments
              : transaction.proofDocument
                ? [transaction.proofDocument]
                : [];
          if (proofs.length === 0) return null;
          return (
            <View style={styles.block}>
              <Text style={styles.sectionLabel}>
                Payment proof{proofs.length > 1 ? "s" : ""}
              </Text>
              {proofs.map((doc, index) => (
                <View key={doc.id} style={styles.proofBox} wrap={false}>
                  <Text style={styles.proofName}>
                    {proofs.length > 1 ? `${index + 1}. ` : ""}
                    {doc.fileName}
                  </Text>
                  <Text style={styles.proofMeta}>
                    {[doc.title, doc.documentNumber, doc.mimeType]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>Kavin Illam</Text>
            <Text style={styles.footerText}>
              Project financial record · Receipt ID:{" "}
              {transaction.transactionNumber}
            </Text>
            <Text style={styles.footerText}>
              Generated {formatDate(generatedAt)} · This receipt was generated
              from the Kavin Illam project ledger.
            </Text>
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
