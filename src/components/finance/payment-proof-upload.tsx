"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignedUpload = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  type: string;
  resourceType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

async function requestSignature(slug: string, file: File): Promise<SignedUpload> {
  const res = await fetch(`/api/p/${slug}/documents/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
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
    throw new Error(data.error?.message || "Upload failed.");
  }
  return data as {
    public_id: string;
    resource_type: string;
    format?: string;
    bytes: number;
  };
}

export type PaymentProofMeta = {
  cloudinaryPublicId: string;
  cloudinaryResourceType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  format: string;
};

/**
 * Shows screenshot upload when payment method is not cash.
 * Renders hidden Cloudinary fields for the parent form.
 */
export function PaymentProofUpload({
  slug,
  paymentMethod,
  cloudinaryReady,
  required = true,
}: {
  slug: string;
  paymentMethod: string;
  cloudinaryReady: boolean;
  required?: boolean;
}) {
  const needsProof = Boolean(paymentMethod && paymentMethod !== "CASH");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaymentProofMeta | null>(null);

  if (!needsProof) {
    return null;
  }

  async function onFileChange(fileList: FileList | null) {
    setError(null);
    setMeta(null);
    const file = fileList?.[0];
    if (!file) return;
    if (!cloudinaryReady) {
      setError("File storage is not configured.");
      return;
    }
    setUploading(true);
    try {
      const signed = await requestSignature(slug, file);
      const uploaded = await uploadToCloudinary(file, signed);
      setMeta({
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryResourceType: uploaded.resource_type || signed.resourceType,
        fileName: signed.fileName,
        mimeType: signed.mimeType,
        fileSize: uploaded.bytes || signed.fileSize,
        format: uploaded.format || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <Label htmlFor="paymentProof">
        Payment screenshot{required ? " *" : ""}
      </Label>
      <p className="text-muted-foreground text-xs">
        Required for UPI, bank transfer, and other non-cash methods. Upload a
        clear screenshot or PDF of the payment confirmation.
      </p>
      <Input
        id="paymentProof"
        type="file"
        accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
        required={required && !meta}
        disabled={uploading || !cloudinaryReady}
        onChange={(event) => void onFileChange(event.target.files)}
      />
      {uploading ? (
        <p className="text-muted-foreground text-xs">Uploading…</p>
      ) : null}
      {meta ? (
        <p className="text-xs text-emerald-600" role="status">
          Ready: {meta.fileName}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!cloudinaryReady ? (
        <p className="text-destructive text-sm" role="alert">
          Cloudinary is not configured, so payment screenshots cannot be
          uploaded.
        </p>
      ) : null}
      {meta ? (
        <>
          <input
            type="hidden"
            name="cloudinaryPublicId"
            value={meta.cloudinaryPublicId}
          />
          <input
            type="hidden"
            name="cloudinaryResourceType"
            value={meta.cloudinaryResourceType}
          />
          <input type="hidden" name="cloudinaryDeliveryType" value="authenticated" />
          <input type="hidden" name="proofFileName" value={meta.fileName} />
          <input type="hidden" name="proofMimeType" value={meta.mimeType} />
          <input
            type="hidden"
            name="proofFileSize"
            value={String(meta.fileSize)}
          />
          <input type="hidden" name="proofFormat" value={meta.format} />
        </>
      ) : null}
    </div>
  );
}
