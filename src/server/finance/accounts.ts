import { z } from "zod";

import { AppError } from "@/lib/errors";
import { paiseFromRupeeString } from "@/lib/money";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { prisma } from "@/server/db/prisma";

const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["BANK", "CASH", "CREDIT_CARD", "UPI", "OTHER"]).default("BANK"),
  institution: z.string().trim().max(120).optional().or(z.literal("")),
  maskedIdentifier: z.string().trim().max(40).optional().or(z.literal("")),
  openingBalanceRupees: z.string().trim().optional().or(z.literal("")),
  currency: z.string().trim().length(3).default("INR"),
});

export async function listAccounts(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");
  return prisma.financialAccount.findMany({
    where: { projectId: ctx.project.id, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

export async function createAccount(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_CREATE");
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid account details.");
  }

  let openingBalance = 0;
  if (parsed.data.openingBalanceRupees?.trim()) {
    try {
      openingBalance = paiseFromRupeeString(parsed.data.openingBalanceRupees);
    } catch {
      throw new AppError("VALIDATION", "Invalid opening balance.");
    }
  }

  return prisma.financialAccount.create({
    data: {
      projectId: ctx.project.id,
      ownerId: ctx.user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      institution: parsed.data.institution || null,
      maskedIdentifier: parsed.data.maskedIdentifier || null,
      openingBalance,
      currency: parsed.data.currency.toUpperCase(),
      status: "ACTIVE",
    },
  });
}
