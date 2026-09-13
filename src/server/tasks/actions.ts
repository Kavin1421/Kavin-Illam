"use server";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors";
import {
  createMilestone,
  createTask,
  updateMilestone,
  updateTask,
} from "@/server/tasks/service";

export type TaskActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createTaskAction(
  slug: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const task = await createTask(slug, formObject(formData));
    redirect(`/p/${slug}/tasks/${task.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateTaskAction(
  slug: string,
  taskId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    await updateTask(slug, taskId, formObject(formData));
    redirect(`/p/${slug}/tasks/${taskId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createMilestoneAction(
  slug: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const milestone = await createMilestone(slug, formObject(formData));
    redirect(`/p/${slug}/milestones/${milestone.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateMilestoneAction(
  slug: string,
  milestoneId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    await updateMilestone(slug, milestoneId, formObject(formData));
    redirect(`/p/${slug}/milestones/${milestoneId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}
