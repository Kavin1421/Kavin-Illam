import { formatInrFromPaise } from "@/lib/money";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { openLoanDiversionReminderTemplate } from "@/server/email/templates";
import { prisma } from "@/server/db/prisma";
import { OPEN_DIVERSION_REMINDER_DAYS } from "@/validators/loans";

export type OpenDiversionReminderItem = {
  loanNumber: string;
  outstanding: number;
  daysOpen: number;
  label: string;
};

/**
 * Email project owners/admins about overdue open rotational diversions.
 * Best-effort: never fails the primary mutation.
 */
export async function notifyOpenLoanDiversions(params: {
  projectId: string;
  projectSlug: string;
  projectName: string;
  items: OpenDiversionReminderItem[];
  reminderDays?: number;
}): Promise<{ emailed: number }> {
  const reminderDays = params.reminderDays ?? OPEN_DIVERSION_REMINDER_DAYS;
  if (params.items.length === 0) return { emailed: 0 };

  try {
    const recipients = await prisma.projectMember.findMany({
      where: {
        projectId: params.projectId,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN", "ACCOUNTANT"] },
      },
      select: {
        user: { select: { email: true } },
      },
    });

    const emails = [
      ...new Set(
        recipients
          .map((row) => row.user.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    if (emails.length === 0) return { emailed: 0 };

    const totalOpenAmount = formatInrFromPaise(
      params.items.reduce((sum, item) => sum + item.outstanding, 0),
    );
    const href = absoluteUrl(`/p/${params.projectSlug}/loans?filter=open`);
    const mail = openLoanDiversionReminderTemplate({
      href,
      projectName: params.projectName,
      reminderDays,
      totalOpenAmount,
      items: params.items.map((item) => ({
        loanNumber: item.loanNumber,
        amount: formatInrFromPaise(item.outstanding),
        daysOpen: item.daysOpen,
        label: item.label,
      })),
    });

    await Promise.all(
      emails.map((to) =>
        sendEmail({ to, ...mail }).catch((error) => {
          logger.warn("Loan diversion reminder failed", {
            to,
            projectId: params.projectId,
            error: error instanceof Error ? error.message : "unknown",
          });
        }),
      ),
    );

    return { emailed: emails.length };
  } catch (error) {
    logger.warn("Loan diversion reminder skipped", {
      projectId: params.projectId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { emailed: 0 };
  }
}
