import type {
  MilestoneStatus,
  TaskPriority,
  TaskStatus,
  Visibility,
} from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  canViewResource,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import {
  allocateMilestoneNumber,
  allocateTaskNumber,
} from "@/server/finance/numbering";
import {
  createMilestoneSchema,
  createTaskSchema,
  updateMilestoneSchema,
  updateTaskSchema,
} from "@/validators/tasks";

import {
  assertMilestoneStatusTransition,
  assertTaskStatusTransition,
  isOpenTaskStatus,
} from "./transitions";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds,
  };
}

function parseOptionalDate(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("VALIDATION", "Invalid date.");
  }
  return date;
}

async function assertActiveMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: "ACTIVE" },
  });
  if (!member) {
    throw new AppError(
      "VALIDATION",
      "Assignee must be an active project member.",
    );
  }
}

async function assertMilestoneInProject(
  projectId: string,
  milestoneId: string,
) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
  });
  if (!milestone) {
    throw new AppError("VALIDATION", "Invalid milestone.");
  }
  return milestone;
}

export async function listTasks(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_VIEW");

  const rows = await prisma.task.findMany({
    where: { projectId: ctx.project.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true, milestoneNumber: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const tasks = rows.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  const openCount = tasks.filter((t) => isOpenTaskStatus(t.status)).length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return {
    project: ctx.project,
    role: ctx.role,
    tasks,
    totals: { openCount, doneCount, total: tasks.length },
  };
}

export async function getTask(slug: string, taskId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_VIEW");

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: ctx.project.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      milestone: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task) {
    throw new AppError("NOT_FOUND", "Task was not found.");
  }

  if (
    !canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(task),
      ctx.project.id,
    )
  ) {
    throw new AppError("NOT_FOUND", "Task was not found.");
  }

  return { project: ctx.project, role: ctx.role, task };
}

export async function createTask(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_CREATE");
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the task details.");
  }

  if (parsed.data.assigneeId) {
    await assertActiveMember(ctx.project.id, parsed.data.assigneeId);
  }
  if (parsed.data.milestoneId) {
    await assertMilestoneInProject(ctx.project.id, parsed.data.milestoneId);
  }

  const dueDate = parseOptionalDate(parsed.data.dueDate);
  const taskNumber = await allocateTaskNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const status = parsed.data.status as TaskStatus;
  const task = await prisma.task.create({
    data: {
      projectId: ctx.project.id,
      taskNumber,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority as TaskPriority,
      status,
      assigneeId: parsed.data.assigneeId || null,
      milestoneId: parsed.data.milestoneId || null,
      dueDate,
      completedAt: status === "DONE" ? new Date() : null,
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
    },
  });

  logger.info("Task created", {
    projectId: ctx.project.id,
    taskId: task.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    metadata: { taskNumber: task.taskNumber, status: task.status },
    activity: {
      message: `${actorLabel(ctx.user)} created task ${task.taskNumber}: ${task.title}.`,
      href: `/p/${slug}/tasks/${task.id}`,
      visibility: task.visibility,
    },
  });

  return task;
}

export async function updateTask(slug: string, taskId: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_EDIT");
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid task update.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: ctx.project.id },
  });
  if (!task) {
    throw new AppError("NOT_FOUND", "Task was not found.");
  }

  if (
    !canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(task),
      ctx.project.id,
    )
  ) {
    throw new AppError("NOT_FOUND", "Task was not found.");
  }

  if (parsed.data.assigneeId) {
    await assertActiveMember(ctx.project.id, parsed.data.assigneeId);
  }
  if (parsed.data.milestoneId) {
    await assertMilestoneInProject(ctx.project.id, parsed.data.milestoneId);
  }

  let nextStatus = task.status;
  if (parsed.data.status) {
    try {
      assertTaskStatusTransition(task.status, parsed.data.status as TaskStatus);
    } catch (error) {
      throw new AppError(
        "CONFLICT",
        error instanceof Error ? error.message : "Invalid status change.",
      );
    }
    nextStatus = parsed.data.status as TaskStatus;
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title ?? task.title,
      description:
        parsed.data.description !== undefined
          ? parsed.data.description || null
          : task.description,
      priority:
        (parsed.data.priority as TaskPriority | undefined) ?? task.priority,
      status: nextStatus,
      assigneeId:
        parsed.data.assigneeId !== undefined
          ? parsed.data.assigneeId || null
          : task.assigneeId,
      milestoneId:
        parsed.data.milestoneId !== undefined
          ? parsed.data.milestoneId || null
          : task.milestoneId,
      dueDate:
        parsed.data.dueDate !== undefined
          ? parseOptionalDate(parsed.data.dueDate)
          : task.dueDate,
      completedAt:
        nextStatus === "DONE"
          ? (task.completedAt ?? new Date())
          : nextStatus === "CANCELLED"
            ? task.completedAt
            : null,
    },
  });

  logger.info("Task updated", {
    projectId: ctx.project.id,
    taskId: task.id,
    actorId: ctx.user.id,
    status: updated.status,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPDATE",
    entityType: "Task",
    entityId: task.id,
    metadata: {
      taskNumber: task.taskNumber,
      fromStatus: task.status,
      toStatus: updated.status,
    },
    activity: {
      message: `${actorLabel(ctx.user)} updated task ${task.taskNumber} (${updated.status}).`,
      href: `/p/${slug}/tasks/${task.id}`,
      visibility: task.visibility,
    },
  });

  return updated;
}

export async function listMilestones(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_VIEW");

  const rows = await prisma.milestone.findMany({
    where: { projectId: ctx.project.id },
    orderBy: [
      { sortOrder: "asc" },
      { targetDate: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true } },
    },
  });

  const milestones = rows.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  return { project: ctx.project, role: ctx.role, milestones };
}

export async function getMilestone(slug: string, milestoneId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_VIEW");

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId: ctx.project.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!milestone) {
    throw new AppError("NOT_FOUND", "Milestone was not found.");
  }

  if (
    !canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(milestone),
      ctx.project.id,
    )
  ) {
    throw new AppError("NOT_FOUND", "Milestone was not found.");
  }

  const visibleTasks = milestone.tasks.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  return {
    project: ctx.project,
    role: ctx.role,
    milestone: { ...milestone, tasks: visibleTasks },
  };
}

export async function createMilestone(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_CREATE");
  const parsed = createMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the milestone details.");
  }

  const targetDate = parseOptionalDate(parsed.data.targetDate);
  const milestoneNumber = await allocateMilestoneNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const status = parsed.data.status as MilestoneStatus;
  const milestone = await prisma.milestone.create({
    data: {
      projectId: ctx.project.id,
      milestoneNumber,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status,
      targetDate,
      completedAt: status === "COMPLETED" ? new Date() : null,
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
    },
  });

  logger.info("Milestone created", {
    projectId: ctx.project.id,
    milestoneId: milestone.id,
    actorId: ctx.user.id,
  });

  return milestone;
}

export async function updateMilestone(
  slug: string,
  milestoneId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "TASK_EDIT");
  const parsed = updateMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid milestone update.");
  }

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId: ctx.project.id },
  });
  if (!milestone) {
    throw new AppError("NOT_FOUND", "Milestone was not found.");
  }

  if (
    !canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(milestone),
      ctx.project.id,
    )
  ) {
    throw new AppError("NOT_FOUND", "Milestone was not found.");
  }

  let nextStatus = milestone.status;
  if (parsed.data.status) {
    try {
      assertMilestoneStatusTransition(
        milestone.status,
        parsed.data.status as MilestoneStatus,
      );
    } catch (error) {
      throw new AppError(
        "CONFLICT",
        error instanceof Error ? error.message : "Invalid status change.",
      );
    }
    nextStatus = parsed.data.status as MilestoneStatus;
  }

  const updated = await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      title: parsed.data.title ?? milestone.title,
      description:
        parsed.data.description !== undefined
          ? parsed.data.description || null
          : milestone.description,
      status: nextStatus,
      targetDate:
        parsed.data.targetDate !== undefined
          ? parseOptionalDate(parsed.data.targetDate)
          : milestone.targetDate,
      completedAt:
        nextStatus === "COMPLETED"
          ? (milestone.completedAt ?? new Date())
          : null,
    },
  });

  logger.info("Milestone updated", {
    projectId: ctx.project.id,
    milestoneId: milestone.id,
    actorId: ctx.user.id,
    status: updated.status,
  });

  return updated;
}
