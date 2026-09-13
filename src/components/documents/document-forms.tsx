"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDocumentVersionAction,
  createDocumentAction,
  type DocumentActionState,
} from "@/server/documents/actions";

const initialState: DocumentActionState = {};

const CATEGORIES = [
  "CONTRACT",
  "BOND",
  "AGREEMENT",
  "INVOICE",
  "RECEIPT",
  "PAYMENT_PROOF",
  "QUOTATION",
  "ESTIMATE",
  "PLAN",
  "DRAWING",
  "APPROVAL",
  "GOVERNMENT_DOCUMENT",
  "IDENTITY_DOCUMENT",
  "WARRANTY",
  "CERTIFICATE",
  "PHOTO",
  "OTHER",
] as const;

type SignedUpload = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  folder: string;
  type: string;
  resourceType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

async function requestSignature(
  slug: string,
  file: File,
  documentId?: string,
): Promise<SignedUpload> {
  const res = await fetch(`/api/p/${slug}/documents/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      documentId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not sign upload.");
  }
  return data as SignedUpload;
}

async function uploadToCloudinary(file: File, signed: SignedUpload) {
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("public_id", signed.publicId);
  body.append("type", signed.type);

  const res = await fetch(signed.uploadUrl, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed.");
  }
  return data as {
    public_id: string;
    resource_type: string;
    format?: string;
    bytes: number;
    secure_url?: string;
  };
}

export function CreateDocumentForm({
  slug,
  cloudinaryReady,
}: {
  slug: string;
  cloudinaryReady: boolean;
}) {
  const action = createDocumentAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{
    cloudinaryPublicId: string;
    cloudinaryResourceType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    format: string;
  } | null>(null);

  async function onFileChange(fileList: FileList | null) {
    setFileError(null);
    setUploadMeta(null);
    const file = fileList?.[0];
    if (!file) return;
    if (!cloudinaryReady) {
      setFileError("Cloudinary is not configured.");
      return;
    }
    setUploading(true);
    try {
      const signed = await requestSignature(slug, file);
      const uploaded = await uploadToCloudinary(file, signed);
      setUploadMeta({
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryResourceType: uploaded.resource_type || signed.resourceType,
        fileName: signed.fileName,
        mimeType: signed.mimeType,
        fileSize: uploaded.bytes || signed.fileSize,
        format: uploaded.format || "",
      });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Foundation contract"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue="CONTRACT"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue="PROJECT_SHARED"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="PROJECT_SHARED">Project shared</option>
            <option value="PRIVATE">Private</option>
            <option value="RESTRICTED">Restricted</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" placeholder="foundation, legal" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => void onFileChange(e.target.files)}
          disabled={uploading || !cloudinaryReady}
        />
        {!cloudinaryReady ? (
          <p className="text-destructive text-sm">
            Set Cloudinary env vars to enable uploads.
          </p>
        ) : null}
        {uploading ? (
          <p className="text-muted-foreground text-sm">
            Uploading to Cloudinary…
          </p>
        ) : null}
        {uploadMeta ? (
          <p className="text-sm text-emerald-700">
            Uploaded: {uploadMeta.fileName}
          </p>
        ) : null}
        {fileError ? (
          <p className="text-destructive text-sm" role="alert">
            {fileError}
          </p>
        ) : null}
      </div>

      {uploadMeta ? (
        <>
          <input
            type="hidden"
            name="cloudinaryPublicId"
            value={uploadMeta.cloudinaryPublicId}
          />
          <input
            type="hidden"
            name="cloudinaryResourceType"
            value={uploadMeta.cloudinaryResourceType}
          />
          <input
            type="hidden"
            name="cloudinaryDeliveryType"
            value="authenticated"
          />
          <input type="hidden" name="fileName" value={uploadMeta.fileName} />
          <input type="hidden" name="mimeType" value={uploadMeta.mimeType} />
          <input
            type="hidden"
            name="fileSize"
            value={String(uploadMeta.fileSize)}
          />
          <input type="hidden" name="format" value={uploadMeta.format} />
        </>
      ) : null}

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || uploading || !uploadMeta}>
        {pending ? "Saving…" : "Save document"}
      </Button>
    </form>
  );
}

export function ReplaceDocumentVersionForm({
  slug,
  documentId,
  cloudinaryReady,
}: {
  slug: string;
  documentId: string;
  cloudinaryReady: boolean;
}) {
  const action = addDocumentVersionAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{
    cloudinaryPublicId: string;
    cloudinaryResourceType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    format: string;
  } | null>(null);

  async function onFileChange(fileList: FileList | null) {
    setFileError(null);
    setUploadMeta(null);
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const signed = await requestSignature(slug, file, documentId);
      const uploaded = await uploadToCloudinary(file, signed);
      setUploadMeta({
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryResourceType: uploaded.resource_type || signed.resourceType,
        fileName: signed.fileName,
        mimeType: signed.mimeType,
        fileSize: uploaded.bytes || signed.fileSize,
        format: uploaded.format || "",
      });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="documentId" value={documentId} />
      <div className="space-y-2">
        <Label htmlFor="changeDescription">Change description</Label>
        <Input
          id="changeDescription"
          name="changeDescription"
          placeholder="Updated signed copy"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="replaceFile">New file</Label>
        <Input
          id="replaceFile"
          type="file"
          onChange={(e) => void onFileChange(e.target.files)}
          disabled={uploading || !cloudinaryReady}
        />
        {uploading ? (
          <p className="text-muted-foreground text-sm">Uploading…</p>
        ) : null}
        {uploadMeta ? (
          <p className="text-sm text-emerald-700">
            Ready: {uploadMeta.fileName}
          </p>
        ) : null}
        {fileError ? (
          <p className="text-destructive text-sm" role="alert">
            {fileError}
          </p>
        ) : null}
      </div>
      {uploadMeta ? (
        <>
          <input
            type="hidden"
            name="cloudinaryPublicId"
            value={uploadMeta.cloudinaryPublicId}
          />
          <input
            type="hidden"
            name="cloudinaryResourceType"
            value={uploadMeta.cloudinaryResourceType}
          />
          <input
            type="hidden"
            name="cloudinaryDeliveryType"
            value="authenticated"
          />
          <input type="hidden" name="fileName" value={uploadMeta.fileName} />
          <input type="hidden" name="mimeType" value={uploadMeta.mimeType} />
          <input
            type="hidden"
            name="fileSize"
            value={String(uploadMeta.fileSize)}
          />
          <input type="hidden" name="format" value={uploadMeta.format} />
        </>
      ) : null}
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || uploading || !uploadMeta}>
        {pending ? "Saving…" : "Add version"}
      </Button>
    </form>
  );
}

export function DocumentAccessButtons({
  slug,
  documentId,
  mimeType,
  fileName,
  canPreview,
}: {
  slug: string;
  documentId: string;
  mimeType: string;
  fileName: string;
  canPreview: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const isImage = mimeType.startsWith("image/");
  const isPdf =
    mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  function fileProxyUrl(download = false) {
    const params = new URLSearchParams();
    if (download) params.set("download", "1");
    const query = params.toString();
    return `/api/p/${slug}/documents/${documentId}/file${query ? `?${query}` : ""}`;
  }

  function revokePreviewUrl() {
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function closePreview() {
    setPreviewOpen(false);
    setLightbox(false);
    revokePreviewUrl();
  }

  function openInNewTab() {
    setError(null);
    window.open(fileProxyUrl(false), "_blank", "noopener,noreferrer");
  }

  function downloadFile() {
    setError(null);
    window.open(fileProxyUrl(true), "_blank", "noopener,noreferrer");
  }

  function showInlinePreview() {
    setError(null);
    startTransition(async () => {
      try {
        revokePreviewUrl();
        const res = await fetch(fileProxyUrl(false), {
          credentials: "same-origin",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || "Could not load document.");
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setPreviewOpen(true);
        setLightbox(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not prepare preview.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canPreview ? (
          <Button type="button" disabled={pending} onClick={showInlinePreview}>
            {pending ? "Preparing…" : "Preview"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={openInNewTab}
        >
          Open in new tab
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={downloadFile}
        >
          Download
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Files are authorized on this app, then streamed from secure storage.
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {previewOpen && previewUrl ? (
        <div className="surface-card space-y-3 rounded-[1.125rem] border border-white/[0.09] p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">In-page preview</p>
            <div className="flex flex-wrap gap-2">
              {isImage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLightbox(true)}
                >
                  Expand
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={closePreview}>
                Close preview
              </Button>
            </div>
          </div>

          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob/object URL after auth
            <img
              src={previewUrl}
              alt={fileName}
              className="mx-auto max-h-[min(70vh,36rem)] w-full cursor-zoom-in rounded-xl bg-black/20 object-contain"
              onClick={() => setLightbox(true)}
            />
          ) : isPdf ? (
            <iframe
              title={`Preview of ${fileName}`}
              src={previewUrl}
              className="h-[min(70vh,36rem)] w-full rounded-xl border border-white/10 bg-black/20"
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Inline preview is not available for this file type. Use Open in
              new tab or Download.
            </p>
          )}
        </div>
      ) : null}

      {lightbox && previewUrl && isImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightbox(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setLightbox(false);
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white transition-ki-fast hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob/object URL after auth */}
          <img
            src={previewUrl}
            alt={fileName}
            className="max-h-[90vh] max-w-[min(96vw,72rem)] rounded-xl object-contain shadow-ki-lg"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
