"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { signIn } from "@/server/auth";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/server/auth/password-reset";
import {
  changeCurrentPassword,
  updateCurrentProfile,
} from "@/server/auth/profile";
import { registerUser } from "@/server/auth/register";
import { assertRateLimit, rateLimitKey } from "@/server/auth/rate-limit";
import { verifyEmailAddress } from "@/server/auth/verify-email";
import {
  acceptInvitation,
  createInvitation,
} from "@/server/invitations/service";
import { loginSchema } from "@/validators/auth";

export type ActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limit = assertRateLimit(
    rateLimitKey("login", email),
    10,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    return {
      error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/projects",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await registerUser(formObject(formData));
    await signIn("credentials", {
      email: user.email,
      password: String(formData.get("password") ?? ""),
      redirectTo: "/projects",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: "Account created. Please sign in.",
      };
    }
    if (error instanceof AppError) {
      return { error: error.message };
    }
    logger.error("Registration action failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: toUserMessage(error) };
  }
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requestPasswordReset(formObject(formData));
    return {
      success:
        "If an account exists for that email, a reset link has been sent.",
    };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await resetPasswordWithToken(formObject(formData));
    redirect("/login?reset=1");
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function verifyEmailAction(
  email: string,
  token: string,
): Promise<ActionState> {
  try {
    await verifyEmailAddress(email, token);
    return { success: "Email verified successfully." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateCurrentProfile(formObject(formData));
    return { success: "Profile updated." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await changeCurrentPassword(formObject(formData));
    return { success: "Password changed." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function createInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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

export async function acceptInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const accepted = await acceptInvitation(formObject(formData));
    const dest = accepted.projectSlug
      ? `/p/${accepted.projectSlug}`
      : "/projects";
    await signIn("credentials", {
      email: accepted.email,
      password: String(formData.get("password") ?? ""),
      redirectTo: dest,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: "Account ready. Please sign in." };
    }
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}
