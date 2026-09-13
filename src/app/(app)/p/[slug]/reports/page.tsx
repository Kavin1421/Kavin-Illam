import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listAvailableReports } from "@/server/reports/service";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { reports } = await listAvailableReports(slug);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Reports</h2>
        <p className="text-muted-foreground text-sm">
          CSV exports are built on the server from your authorized dataset only.
          Private finance never enters shared totals.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reports available</CardTitle>
            <CardDescription>
              Your role does not include report permissions yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/api/p/${slug}/reports/${report.id}/csv`}
                  className={cn(buttonVariants({ size: "sm" }))}
                  prefetch={false}
                >
                  Download CSV
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
