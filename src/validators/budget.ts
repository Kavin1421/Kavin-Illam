import { z } from "zod";

export const budgetLineSchema = z.object({
  categoryId: z.string().optional().or(z.literal("")),
  label: z.string().trim().min(1).max(120),
  plannedAmountRupees: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const upsertBudgetSchema = z.object({
  name: z.string().trim().min(2).max(120).default("Project budget"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  totalPlannedRupees: z.string().trim().optional().or(z.literal("")),
  defaultRemainingMode: z.enum(["VS_PAID", "VS_COMMITTED"]).default("VS_PAID"),
  /// JSON array of budget lines from the form
  linesJson: z.string().min(2),
});
