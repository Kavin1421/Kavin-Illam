import type { Metadata } from "next";

import { WorkSpecificationsView } from "@/components/specs/work-specifications-view";
import { requireProjectPermissionBySlug } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Work specifications",
};

export default async function WorkSpecificationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireProjectPermissionBySlug(slug, "PROJECT_VIEW");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <WorkSpecificationsView />
    </div>
  );
}
