"use server";

import { z } from "zod";

import { AppError, toUserMessage } from "@/lib/errors";
import { formatInrFromPaise } from "@/lib/money";
import { absoluteUrl, isEmailConfigured, sendEmail } from "@/server/email/send";
import { getTransaction } from "@/server/finance/transactions";

const emailReceiptSchema = z.object({
  to: z.string().trim().email("Enter a valid email address."),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(4000),
});

export type EmailReceiptState = {
  error?: string;
  success?: string;
};

export async function emailPaymentReceiptAction(
  slug: string,
  transactionId: string,
  _prev: EmailReceiptState,
  formData: FormData,
): Promise<EmailReceiptState> {
  try {
    if (!isEmailConfigured()) {
      return {
        error:
          "Email is not configured. Set SMTP or Resend environment variables.",
      };
    }

    const parsed = emailReceiptSchema.safeParse({
      to: formData.get("to"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Please check the form.",
      };
    }

    const { project, transaction } = await getTransaction(slug, transactionId);
    const amount = formatInrFromPaise(transaction.amount);
    const receiptUrl = absoluteUrl(`/p/${slug}/finance/${transaction.id}`);

    const text = [
      parsed.data.message,
      "",
      "—",
      `Project: ${project.name}`,
      `Receipt: ${transaction.transactionNumber}`,
      `Amount: ${amount}`,
      `Date: ${transaction.transactionDate.toISOString().slice(0, 10)}`,
      `Method: ${transaction.paymentMethod ?? "—"}`,
      `Paid to: ${transaction.paidTo ?? "—"}`,
      `View receipt: ${receiptUrl}`,
    ].join("\n");

    const html = `
      <p>${parsed.data.message.replaceAll("\n", "<br/>")}</p>
      <hr />
      <p><strong>${project.name}</strong></p>
      <p>Receipt <code>${transaction.transactionNumber}</code></p>
      <p>Amount paid: <strong>${amount}</strong></p>
      <p><a href="${receiptUrl}">Open payment receipt</a></p>
    `;

    const result = await sendEmail({
      to: parsed.data.to,
      subject: parsed.data.subject,
      text,
      html,
    });

    if (!result.delivered) {
      return {
        error:
          "Email provider is not configured in this environment. Receipt was not sent.",
      };
    }

    return { success: "Receipt sent successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    return { error: toUserMessage(error) };
  }
}
