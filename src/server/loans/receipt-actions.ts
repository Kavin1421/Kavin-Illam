"use server";

import { z } from "zod";

import { AppError, toUserMessage } from "@/lib/errors";
import { absoluteUrl, isEmailConfigured, sendEmail } from "@/server/email/send";
import { generateLoanReceiptPdf } from "@/server/pdf/generate-loan-receipt";

const emailReceiptSchema = z.object({
  to: z.string().trim().email("Enter a valid email address."),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(4000),
});

export type EmailLoanReceiptState = {
  error?: string;
  success?: string;
};

export async function emailLoanReceiptAction(
  slug: string,
  transactionId: string,
  _prev: EmailLoanReceiptState,
  formData: FormData,
): Promise<EmailLoanReceiptState> {
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

    const pdf = await generateLoanReceiptPdf(slug, transactionId);
    const receiptUrl = absoluteUrl(`/p/${slug}/loans/${transactionId}`);

    const text = [
      parsed.data.message,
      "",
      "—",
      `Receipt: ${pdf.loanNumber}`,
      `Attachment: ${pdf.fileName}`,
      `View receipt: ${receiptUrl}`,
    ].join("\n");

    const html = `
      <p>${parsed.data.message.replaceAll("\n", "<br/>")}</p>
      <hr />
      <p>Receipt <code>${pdf.loanNumber}</code></p>
      <p>Attached: <strong>${pdf.fileName}</strong></p>
      <p><a href="${receiptUrl}">Open loan receipt</a></p>
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
      return { error: "Email could not be delivered." };
    }

    return { success: `Receipt emailed to ${parsed.data.to}.` };
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    return { error: toUserMessage(error) };
  }
}
