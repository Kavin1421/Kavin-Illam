import { z } from "zod";

import { visibilitySchema } from "@/validators/finance";

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const milestoneStatusSchema = z.enum([
  "UPCOMING",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  priority: taskPrioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("TODO"),
  assigneeId: z.string().optional().or(z.literal("")),
  milestoneId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  assigneeId: z.string().optional().or(z.literal("")),
  milestoneId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: milestoneStatusSchema.default("UPCOMING"),
  targetDate: z.string().optional().or(z.literal("")),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
});

export const updateMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: milestoneStatusSchema.optional(),
  targetDate: z.string().optional().or(z.literal("")),
});
