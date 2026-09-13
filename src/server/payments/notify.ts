import { formatInrFromPaise } from "@/lib/money";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { paymentRequestNotifyTemplate } from "@/server/email/templates";
import { prisma } from "@/server/db/prisma";

/**
 * Notify project owners/admins that a payment request needs attention.
 * Best-effort: never fails the primary mutation.
 */
export async function notifyPaymentRequestCreated(params: {
  projectId: string;
  projectSlug: string;
  projectName: string;
  requestId: string;
  requestNumber: string;
  title: string;
  amountPaise: number;
  requesterName: string;
}) {
  try {
    const recipients = await prisma.projectMember.findMany({
      where: {
        projectId: params.projectId,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: {
        user: { select: { email: true, name: true } },
      },
    });

    const emails = [
      ...new Set(
        recipients
          .map((row) => row.user.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    ];

    if (emails.length === 0) return;

    const href = absoluteUrl(
      `/p/${params.projectSlug}/payment-requests/${params.requestId}`,
    );
    const amount = formatInrFromPaise(params.amountPaise);
    const mail = paymentRequestNotifyTemplate({
      href,
      projectName: params.projectName,
      requestNumber: params.requestNumber,
      title: params.title,
      amount,
      requesterName: params.requesterName,
    });

    await Promise.all(
      emails.map((to) =>
        sendEmail({ to, ...mail }).catch((error) => {
          logger.warn("Payment request notify failed", {
            to,
            requestId: params.requestId,
            error: error instanceof Error ? error.message : "unknown",
          });
        }),
      ),
    );
  } catch (error) {
    logger.warn("Payment request notify skipped", {
      requestId: params.requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
