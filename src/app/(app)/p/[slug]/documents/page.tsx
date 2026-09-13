import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { listDocuments } from "@/server/documents/service";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, documents, cloudinaryReady } = await listDocuments(slug);
  const canUpload = roleHasPermission(role, "DOCUMENT_UPLOAD");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Documents</h2>
          <p className="text-muted-foreground text-sm">
            Private Cloudinary delivery — preview and download require
            authorization.
          </p>
        </div>
        {canUpload ? (
          <Link
            href={`/p/${slug}/documents/new`}
            className={cn(buttonVariants())}
          >
            Upload document
          </Link>
        ) : null}
      </div>

      {!cloudinaryReady ? (
        <Card>
          <CardHeader>
            <CardTitle>Cloudinary not configured</CardTitle>
            <CardDescription>
              Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and
              CLOUDINARY_API_SECRET to enable uploads.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No documents yet</CardTitle>
            <CardDescription>
              Contracts, receipts, plans, and payment proofs live here with
              version history.
            </CardDescription>
          </CardHeader>
          {canUpload && cloudinaryReady ? (
            <CardContent>
              <Link
                href={`/p/${slug}/documents/new`}
                className={cn(buttonVariants())}
              >
                Upload first document
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2 font-medium">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/p/${slug}/documents/${doc.id}`}
                        className="hover:underline"
                      >
                        {formatDate(doc.updatedAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {doc.documentNumber}
                    </td>
                    <td className="px-3 py-2">{doc.title}</td>
                    <td className="px-3 py-2">
                      {doc.category.replaceAll("_", " ")}
                    </td>
                    <td className="px-3 py-2">v{doc.currentVersion}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{doc.visibility}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/p/${slug}/documents/${doc.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {doc.category.replaceAll("_", " ")} · v
                      {doc.currentVersion}
                    </p>
                  </div>
                  <Badge variant="outline">{doc.visibility}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {doc.documentNumber}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
