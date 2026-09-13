"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProjectAction,
  inviteMemberAction,
  updateProjectAction,
  type ProjectActionState,
} from "@/server/projects/actions";

const initialState: ProjectActionState = {};

export function CreateProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder="Kavin Illam"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectType">Type</Label>
        <select
          id="projectType"
          name="projectType"
          defaultValue="RESIDENTIAL"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="RENOVATION">Renovation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Site address" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="estimatedBudgetRupees">Estimated budget (₹)</Label>
        <Input
          id="estimatedBudgetRupees"
          name="estimatedBudgetRupees"
          placeholder="5000000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <input type="hidden" name="currency" value="INR" />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}

export function EditProjectForm({
  slug,
  defaults,
}: {
  slug: string;
  defaults: {
    name: string;
    description?: string | null;
    projectType: string;
    address?: string | null;
    status: string;
    estimatedBudgetRupees?: string;
  };
}) {
  const action = updateProjectAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={defaults.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={defaults.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectType">Type</Label>
        <select
          id="projectType"
          name="projectType"
          defaultValue={defaults.projectType}
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="RENOVATION">Renovation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaults.address ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="estimatedBudgetRupees">Estimated budget (₹)</Label>
        <Input
          id="estimatedBudgetRupees"
          name="estimatedBudgetRupees"
          defaultValue={defaults.estimatedBudgetRupees ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaults.status}
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On hold</option>
          <option value="COMPLETED">Completed</option>
        </select>
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
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
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
