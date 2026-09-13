import { z } from "zod";

const roleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "ENGINEER",
  "CONTRACTOR",
  "ARCHITECT",
  "ACCOUNTANT",
  "VIEWER",
]);

export const requestJoinProjectSchema = z.object({
  projectId: z.string().min(1),
  requestedRole: roleSchema.default("ENGINEER"),
  message: z.string().max(1000).optional(),
});

export const requestCreateProjectSchema = z.object({
  proposedName: z.string().trim().min(2).max(120),
  proposedType: z
    .enum(["RESIDENTIAL", "COMMERCIAL", "RENOVATION", "OTHER"])
    .default("RESIDENTIAL"),
  proposedDescription: z.string().max(2000).optional(),
  proposedAddress: z.string().max(500).optional(),
  message: z.string().max(1000).optional(),
});

export const reviewAccessRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().max(1000).optional(),
  /** Optional override when approving a join */
  role: roleSchema.optional(),
});
