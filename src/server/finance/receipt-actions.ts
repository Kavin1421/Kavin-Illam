"use server";

import { z } from "zod";

import { AppError, toUserMessage } from "@/lib/errors";
import { absoluteUrl, isEmailConfigured, sendEmail } from "@/server/email/send";
import { generateTransactionReceiptPdf } from "@/server/pdf/generate-transaction-receipt";

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

    // Same authorized PDF generator used by Download PDF.
    const pdf = await generateTransactionReceiptPdf(slug, transactionId);
    const receiptUrl = absoluteUrl(`/p/${slug}/finance/${transactionId}`);

    const text = [
      parsed.data.message,
      "",
      "—",
      `Receipt: ${pdf.transactionNumber}`,
      `Attachment: ${pdf.fileName}`,
      `View receipt: ${receiptUrl}`,
    ].join("\n");

    const html = `
      <p>${parsed.data.message.replaceAll("\n", "<br/>")}</p>
      <hr />
      <p>Receipt <code>${pdf.transactionNumber}</code></p>
      <p>Attached: <strong>${pdf.fileName}</strong></p>
      <p><a href="${receiptUrl}">Open payment receipt</a></p>
    `;

    const result = await sendEmail({
      to: parsed.data.to,
      subject: parsed.data.subject,
      text,
      html,
      attachments: [
        {
          filename: pdf.fileName,
          content: pdf.bytes,
          contentType: pdf.contentType,
        },
      ],
    });

    if (!result.delivered) {
      return {
        error:
          "Email provider is not configured in this environment. Receipt was not sent.",
      };
    }

    return {
      success: `Receipt sent successfully to ${parsed.data.to}.`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    return { error: toUserMessage(error) };
  }
}
