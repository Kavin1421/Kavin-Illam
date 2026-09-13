"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import {
  requestCreateProject,
  requestJoinProject,
  reviewAccessRequest,
} from "@/server/access-requests/service";

export type AccessRequestActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function requestJoinProjectAction(
  _prev: AccessRequestActionState,
  formData: FormData,
): Promise<AccessRequestActionState> {
  try {
    await requestJoinProject(formObject(formData));
    return {
      success: "Join request submitted. The superadmin will review it.",
    };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function requestCreateProjectAction(
  _prev: AccessRequestActionState,
  formData: FormData,
): Promise<AccessRequestActionState> {
  try {
    await requestCreateProject(formObject(formData));
    return {
      success: "Create request submitted. The superadmin will review it.",
    };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function reviewAccessRequestAction(
  _prev: AccessRequestActionState,
  formData: FormData,
): Promise<AccessRequestActionState> {
  try {
    const result = await reviewAccessRequest(formObject(formData));
    redirect("/admin/access-requests");
    return {
      success:
        result.status === "APPROVED"
          ? "Request approved."
          : "Request rejected.",
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AppError) {
      return { error: error.message };
    }
    return { error: toUserMessage(error) };
  }
}
