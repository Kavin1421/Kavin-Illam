import { NextResponse } from "next/server";

import { runOpenDiversionReminderCron } from "@/server/loans/service";
import { OPEN_DIVERSION_REMINDER_DAYS } from "@/validators/loans";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}`;
}

/**
 * Weekly cron: email owners/admins/accountants about diversions open 7+ days.
 * Secure with Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runOpenDiversionReminderCron();
  return NextResponse.json({
    ok: true,
    ...result,
    reminderDays: OPEN_DIVERSION_REMINDER_DAYS,
  });
}
