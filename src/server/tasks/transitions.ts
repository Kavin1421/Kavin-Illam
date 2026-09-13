import type { MilestoneStatus, TaskStatus } from "@prisma/client";

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "TODO", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  DONE: ["IN_PROGRESS", "TODO"],
  CANCELLED: ["TODO"],
};

const MILESTONE_TRANSITIONS: Record<
  MilestoneStatus,
  readonly MilestoneStatus[]
> = {
  UPCOMING: ["IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "MISSED", "UPCOMING", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"],
  MISSED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  CANCELLED: ["UPCOMING"],
};

export function assertTaskStatusTransition(
  from: TaskStatus,
  to: TaskStatus,
): void {
  if (from === to) return;
  const allowed = TASK_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Cannot move task from ${from} to ${to}.`);
  }
}

export function assertMilestoneStatusTransition(
  from: MilestoneStatus,
  to: MilestoneStatus,
): void {
  if (from === to) return;
  const allowed = MILESTONE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Cannot move milestone from ${from} to ${to}.`);
  }
}

export function isOpenTaskStatus(status: TaskStatus): boolean {
  return status === "TODO" || status === "IN_PROGRESS" || status === "BLOCKED";
}
