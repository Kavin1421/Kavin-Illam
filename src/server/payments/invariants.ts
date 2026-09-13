import type { PaymentRequestStatus } from "@prisma/client";

/**
 * Payment-request workflow invariants (server-only).
 * PAID / PARTIALLY_PAID always require a linked ledger transaction.
 */

export function assertCanMarkPaid(params: {
  linkedTransactionId: string | null | undefined;
  paidAmount: number;
  paymentDate?: Date | null;
}): void {
  if (!params.linkedTransactionId) {
    throw new Error(
      "Payment request cannot be marked paid without a linked transaction.",
    );
  }
  if (!Number.isInteger(params.paidAmount) || params.paidAmount <= 0) {
    throw new Error("Paid amount must be a positive integer.");
  }
  if (!params.paymentDate || Number.isNaN(params.paymentDate.getTime())) {
    throw new Error("Paid payment requests require a payment date.");
  }
}

export function derivePaymentRequestStatus(params: {
  requestedAmount: number;
  paidAmount: number;
  hasLinkedTransaction: boolean;
}): Extract<PaymentRequestStatus, "PAID" | "PARTIALLY_PAID"> {
  if (!params.hasLinkedTransaction) {
    throw new Error(
      "Payment request cannot be marked paid without a linked transaction.",
    );
  }
  if (params.paidAmount <= 0) {
    throw new Error("Paid amount must be a positive integer.");
  }
  if (params.paidAmount > params.requestedAmount) {
    throw new Error("Paid amount cannot exceed requested amount.");
  }
  if (params.paidAmount === params.requestedAmount) return "PAID";
  return "PARTIALLY_PAID";
}

export function assertValidReviewTransition(
  current: PaymentRequestStatus,
  next: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
): void {
  if (current !== "PENDING" && current !== "CHANGES_REQUESTED") {
    throw new Error(`Cannot ${next.toLowerCase()} from status ${current}.`);
  }
}

export function assertCanPay(current: PaymentRequestStatus): void {
  if (current !== "APPROVED") {
    throw new Error("Only approved requests can be paid.");
  }
}
