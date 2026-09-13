import type { Metadata } from "next";

import { InviteMemberForm } from "@/components/projects/project-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { roleHasPermission } from "@/server/authorization";
import { listPendingInvitations } from "@/server/invitations/service";
import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/server/projects/actions";
import { listProjectMembers } from "@/server/projects/members";

export const metadata: Metadata = {
  title: "Members",
};

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, role, members } = await listProjectMembers(slug);
  const canInvite = roleHasPermission(role, "MEMBER_INVITE");
  const canManage = roleHasPermission(role, "MEMBER_REMOVE");
  const pending = canInvite ? await listPendingInvitations(project.id) : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Members</h2>
        <p className="text-muted-foreground text-sm">
          Manage who can access {project.name} and with which role.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="text-muted-foreground text-sm">
                  {member.user.email}
                </p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  <Badge variant="outline">{member.status}</Badge>
                </div>
              </div>
              {canManage && member.role !== "OWNER" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <form
                    action={updateMemberRoleAction.bind(null, slug)}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="memberId" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="ENGINEER">Engineer</option>
                      <option value="ARCHITECT">Architect</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <Button type="submit" size="sm" variant="secondary">
                      Update
                    </Button>
                  </form>
                  <form action={removeMemberAction.bind(null, slug)}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Remove
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {canInvite ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invite member</CardTitle>
              <CardDescription>
                Sends an email invite linked to this project. On accept, the
                user becomes a project member with the selected role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMemberForm projectId={project.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No pending invites.
                </p>
              ) : (
                pending.map((invite) => (
                  <div key={invite.id} className="text-sm">
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-muted-foreground">
                      {invite.role} · expires {formatDateTime(invite.expiresAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
