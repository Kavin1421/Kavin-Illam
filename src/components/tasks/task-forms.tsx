"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMilestoneAction,
  createTaskAction,
  updateMilestoneAction,
  updateTaskAction,
  type TaskActionState,
} from "@/server/tasks/actions";

const initialState: TaskActionState = {};

type MemberOption = { id: string; name: string };
type MilestoneOption = { id: string; title: string };

export function CreateTaskForm({
  slug,
  members,
  milestones,
}: {
  slug: string;
  members: MemberOption[];
  milestones: MilestoneOption[];
}) {
  const action = createTaskAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Pour foundation" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            defaultValue="MEDIUM"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue=""
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestoneId">Milestone</Label>
          <select
            id="milestoneId"
            name="milestoneId"
            defaultValue=""
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="">None</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input type="hidden" name="status" value="TODO" />
      <input type="hidden" name="visibility" value="PROJECT_SHARED" />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create task"}
      </Button>
    </form>
  );
}

export function UpdateTaskForm({
  slug,
  taskId,
  members,
  milestones,
  defaults,
}: {
  slug: string;
  taskId: string;
  members: MemberOption[];
  milestones: MilestoneOption[];
  defaults: {
    title: string;
    description: string;
    priority: string;
    status: string;
    assigneeId: string;
    milestoneId: string;
    dueDate: string;
  };
}) {
  const action = updateTaskAction.bind(null, slug, taskId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={defaults.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={defaults.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={defaults.assigneeId}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestoneId">Milestone</Label>
          <select
            id="milestoneId"
            name="milestoneId"
            defaultValue={defaults.milestoneId}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="">None</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
          />
        </div>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update task"}
      </Button>
    </form>
  );
}

export function CreateMilestoneForm({ slug }: { slug: string }) {
  const action = createMilestoneAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Foundation complete"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetDate">Target date</Label>
        <Input id="targetDate" name="targetDate" type="date" />
      </div>
      <input type="hidden" name="status" value="UPCOMING" />
      <input type="hidden" name="visibility" value="PROJECT_SHARED" />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create milestone"}
      </Button>
    </form>
  );
}

export function UpdateMilestoneForm({
  slug,
  milestoneId,
  defaults,
}: {
  slug: string;
  milestoneId: string;
  defaults: {
    title: string;
    description: string;
    status: string;
    targetDate: string;
  };
}) {
  const action = updateMilestoneAction.bind(null, slug, milestoneId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={defaults.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={defaults.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="UPCOMING">Upcoming</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="MISSED">Missed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetDate">Target date</Label>
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={defaults.targetDate}
          />
        </div>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update milestone"}
      </Button>
    </form>
  );
}
