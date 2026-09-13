"use server";

import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import { createInvitation } from "@/server/invitations/service";
import {
  removeMember,
  updateMemberRole,
} from "@/server/projects/members";
import {
  archiveProject,
  createProject,
  updateProject,
} from "@/server/projects/service";

export type ProjectActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    const project = await createProject(formObject(formData));
    redirect(`/p/${project.slug}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateProjectAction(
  slug: string,
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    await updateProject(slug, formObject(formData));
    return { success: "Project updated." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function archiveProjectAction(
  slug: string,
  formData?: FormData,
): Promise<void> {
  void formData;
  await archiveProject(slug);
  redirect("/projects");
}

export async function inviteMemberAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    const invitation = await createInvitation(formObject(formData));
    return {
      success: `Invitation sent to ${invitation.email}.`,
      inviteUrl: invitation.inviteUrl,
    };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function updateMemberRoleAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  await updateMemberRole(slug, formObject(formData));
}

export async function removeMemberAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  await removeMember(slug, formObject(formData));
}
