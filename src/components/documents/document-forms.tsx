"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDocumentVersionAction,
  createDocumentAction,
  issueDocumentUrlAction,
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
        <Input id="title" name="title" required placeholder="Foundation contract" />
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
          <p className="text-muted-foreground text-sm">Uploading to Cloudinary…</p>
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
          <input type="hidden" name="cloudinaryDeliveryType" value="authenticated" />
          <input type="hidden" name="fileName" value={uploadMeta.fileName} />
          <input type="hidden" name="mimeType" value={uploadMeta.mimeType} />
          <input type="hidden" name="fileSize" value={String(uploadMeta.fileSize)} />
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
          <p className="text-sm text-emerald-700">Ready: {uploadMeta.fileName}</p>
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
          <input type="hidden" name="cloudinaryDeliveryType" value="authenticated" />
          <input type="hidden" name="fileName" value={uploadMeta.fileName} />
          <input type="hidden" name="mimeType" value={uploadMeta.mimeType} />
          <input type="hidden" name="fileSize" value={String(uploadMeta.fileSize)} />
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
}: {
  slug: string;
  documentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openUrl(download: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await issueDocumentUrlAction(slug, documentId, download);
      if (result.error || !result.url) {
        setError(result.error || "Could not issue URL.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => openUrl(false)}>
          {pending ? "Preparing…" : "Preview / open"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => openUrl(true)}
        >
          Download
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Opens a short-lived signed Cloudinary URL after authorization.
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
