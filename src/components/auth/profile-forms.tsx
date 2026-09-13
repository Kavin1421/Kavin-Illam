"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  createInvitationAction,
  updateProfileAction,
  type ActionState,
} from "@/server/auth/actions";

const initialState: ActionState = {};

export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          defaultValue={name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Invitee email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" name="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          defaultValue="ENGINEER"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="ENGINEER">Engineer</option>
          <option value="ARCHITECT">Architect</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="ACCOUNTANT">Accountant</option>
          <option value="VIEWER">Viewer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-700" role="status">
            {state.success}
          </p>
          {state.inviteUrl ? (
            <p className="text-muted-foreground break-all text-xs">
              Invite link: {state.inviteUrl}
            </p>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}
