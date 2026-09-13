"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestCreateProjectAction,
  requestJoinProjectAction,
  reviewAccessRequestAction,
  type AccessRequestActionState,
} from "@/server/access-requests/actions";

const initialState: AccessRequestActionState = {};

type JoinableProject = {
  id: string;
  name: string;
  slug: string;
};

export function RequestJoinForm({ projects }: { projects: JoinableProject[] }) {
  const [state, formAction, pending] = useActionState(
    requestJoinProjectAction,
    initialState,
  );

  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No joinable projects right now. You can request a new project instead,
        or wait for an invitation.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectId">Project</Label>
        <select
          id="projectId"
          name="projectId"
          required
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select a project
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.slug})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestedRole">Requested role</Label>
        <select
          id="requestedRole"
          name="requestedRole"
          defaultValue="ENGINEER"
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
        >
          <option value="ENGINEER">Engineer</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="ARCHITECT">Architect</option>
          <option value="ACCOUNTANT">Accountant</option>
          <option value="VIEWER">Viewer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message (optional)</Label>
        <Input id="message" name="message" placeholder="Why you need access" />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-400" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Request to join"}
      </Button>
    </form>
  );
}

export function RequestCreateForm() {
  const [state, formAction, pending] = useActionState(
    requestCreateProjectAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="proposedName">Proposed project name</Label>
        <Input
          id="proposedName"
          name="proposedName"
          required
          minLength={2}
          placeholder="Site / house name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proposedType">Type</Label>
        <select
          id="proposedType"
          name="proposedType"
          defaultValue="RESIDENTIAL"
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="RENOVATION">Renovation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="proposedAddress">Address (optional)</Label>
        <Input id="proposedAddress" name="proposedAddress" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proposedDescription">Description (optional)</Label>
        <Input id="proposedDescription" name="proposedDescription" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message to superadmin (optional)</Label>
        <Input id="message" name="message" />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-400" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Request new project"}
      </Button>
    </form>
  );
}

export function ReviewAccessRequestButtons({
  requestId,
}: {
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState(
    reviewAccessRequestAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="APPROVE" />
          <Button type="submit" size="sm" disabled={pending}>
            Approve
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="REJECT" />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Reject
          </Button>
        </form>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
