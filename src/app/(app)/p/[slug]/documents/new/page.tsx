import type { Metadata } from "next";
import Link from "next/link";

import { CreateDocumentForm } from "@/components/documents/document-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { requireProjectPermissionBySlug } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Upload document",
};

export default async function NewDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireProjectPermissionBySlug(slug, "DOCUMENT_UPLOAD");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Upload document</h2>
        <p className="text-muted-foreground text-sm">
          Server-signed Cloudinary upload with authenticated delivery.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document details</CardTitle>
          <CardDescription>
            File uploads use a short-lived signature — the API secret never
            reaches the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateDocumentForm
            slug={slug}
            cloudinaryReady={isCloudinaryConfigured()}
          />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/documents`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to documents
      </Link>
    </div>
  );
}
