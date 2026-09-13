import type { Metadata } from "next";
import Link from "next/link";

import {
  DocumentAccessButtons,
  ReplaceDocumentVersionForm,
} from "@/components/documents/document-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { withNotFound } from "@/lib/with-not-found";
import { roleHasPermission } from "@/server/authorization";
import {
  archiveDocumentAction,
  restoreDocumentVersionAction,
} from "@/server/documents/actions";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { getDocument } from "@/server/documents/service";

export const metadata: Metadata = {
  title: "Document",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; documentId: string }>;
}) {
  const { slug, documentId } = await params;
  const { role, document, canPreview } = await withNotFound(() =>
    getDocument(slug, documentId),
  );
  const canUpload = roleHasPermission(role, "DOCUMENT_UPLOAD");
  const canEdit = roleHasPermission(role, "DOCUMENT_EDIT");
  const canDelete = roleHasPermission(role, "DOCUMENT_DELETE");
  const cloudinaryReady = isCloudinaryConfigured();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {document.documentNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">
          {document.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>{document.category.replaceAll("_", " ")}</Badge>
          <Badge variant="secondary">v{document.currentVersion}</Badge>
          <Badge variant="outline">{document.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {document.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>File: {document.fileName}</p>
          <p>
            Size: {(document.fileSize / 1024).toFixed(1)} KB ·{" "}
            {document.mimeType}
          </p>
          <p>
            Uploaded by: {document.uploadedBy.name ?? document.uploadedBy.email}{" "}
            · {formatDateTime(document.updatedAt)}
          </p>
          {document.tags.length > 0 ? (
            <p>Tags: {document.tags.join(", ")}</p>
          ) : null}
          {document.expiryDate ? (
            <p>Expires: {formatDate(document.expiryDate)}</p>
          ) : null}
          {canPreview ? (
            <p>Inline preview supported for this type.</p>
          ) : (
            <p>Preview not available — use download.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            URLs are issued only after permission checks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentAccessButtons
            slug={slug}
            documentId={documentId}
            mimeType={document.mimeType}
            fileName={document.fileName}
            canPreview={canPreview}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>
            Replacing a file creates a new version — never silent overwrite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {document.versions.map((version) => (
            <div
              key={version.id}
              className="border-border flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">
                  v{version.versionNumber}
                  {version.isCurrent ? " · current" : ""}
                </p>
                <p className="text-muted-foreground text-sm">
                  {version.fileName}
                  {version.changeDescription
                    ? ` · ${version.changeDescription}`
                    : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  {version.uploadedBy.name ?? version.uploadedBy.email} ·{" "}
                  {formatDateTime(version.createdAt)}
                </p>
              </div>
              {canEdit && !version.isCurrent ? (
                <form
                  action={restoreDocumentVersionAction.bind(
                    null,
                    slug,
                    documentId,
                  )}
                >
                  <input type="hidden" name="versionId" value={version.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Restore
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {canUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Replace file</CardTitle>
            <CardDescription>
              Creates version {document.currentVersion + 1}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReplaceDocumentVersionForm
              slug={slug}
              documentId={documentId}
              cloudinaryReady={cloudinaryReady}
            />
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/p/${slug}/documents`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to documents
      </Link>

      {canDelete ? (
        <Card>
          <CardHeader>
            <CardTitle>Archive</CardTitle>
            <CardDescription>
              Archives the document without hard-deleting history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={archiveDocumentAction.bind(null, slug, documentId)}>
              <Button type="submit" variant="destructive">
                Archive document
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
