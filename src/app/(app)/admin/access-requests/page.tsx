import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewAccessRequestButtons } from "@/components/projects/access-request-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listPendingAccessRequests } from "@/server/access-requests/service";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { resolveIsSuperadmin } from "@/server/auth/superadmin";

export const metadata: Metadata = {
  title: "Access requests",
};

export default async function AdminAccessRequestsPage() {
  const user = await requireAuthenticatedUser();
  if (!(await resolveIsSuperadmin({ id: user.id, email: user.email }))) {
    redirect("/projects");
  }

  const pending = await listPendingAccessRequests();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl tracking-tight">
            Access requests
          </h1>
          <p className="text-muted-foreground text-sm">
            Approve join or create requests. Nothing is granted until you
            approve.
          </p>
        </div>
        <Link href="/projects" className={cn(buttonVariants({ variant: "outline" }))}>
          Projects
        </Link>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All clear</CardTitle>
            <CardDescription>No pending access requests.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {request.type === "JOIN_PROJECT"
                        ? `Join · ${request.project?.name ?? "Unknown project"}`
                        : `Create · ${request.proposedName ?? "Untitled"}`}
                    </CardTitle>
                    <CardDescription>
                      From {request.requester.name ?? "User"} (
                      {request.requester.email}) · role{" "}
                      {request.requestedRole}
                    </CardDescription>
                  </div>
                  <Badge>{request.type.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {request.message ? (
                  <p className="text-muted-foreground">{request.message}</p>
                ) : null}
                {request.type === "CREATE_PROJECT" ? (
                  <p className="text-muted-foreground">
                    Type: {request.proposedType ?? "RESIDENTIAL"}
                    {request.proposedAddress
                      ? ` · ${request.proposedAddress}`
                      : ""}
                  </p>
                ) : null}
                <ReviewAccessRequestButtons requestId={request.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
