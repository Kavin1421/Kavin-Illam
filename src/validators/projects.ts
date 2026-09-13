import { z } from "zod";

export const projectTypeSchema = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "RENOVATION",
  "OTHER",
]);

export const projectStatusSchema = z.enum([
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  projectType: projectTypeSchema.default("RESIDENTIAL"),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  currency: z.string().trim().length(3).default("INR"),
  estimatedBudgetRupees: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  expectedCompletionDate: z.string().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema
  .extend({
    status: projectStatusSchema.optional(),
  })
  .partial()
  .extend({
    name: z.string().trim().min(2).max(120).optional(),
  });

export const removeMemberSchema = z.object({
  memberId: z.string().min(1),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum([
    "ADMIN",
    "ENGINEER",
    "CONTRACTOR",
    "ARCHITECT",
    "ACCOUNTANT",
    "VIEWER",
  ]),
});
