"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_PAYMENT_PROOFS } from "@/validators/payment-proof";

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
  cloudinaryDeliveryType: "authenticated";
  proofFileName: string;
  proofMimeType: string;
  proofFileSize: number;
  proofFormat: string;
};

/**
 * Multi-file payment screenshot upload (1–5) for non-cash methods.
 * Posts `paymentProofsJson` for the parent form.
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
  const [items, setItems] = useState<PaymentProofMeta[]>([]);

  if (!needsProof) {
    return null;
  }

  const remaining = MAX_PAYMENT_PROOFS - items.length;

  async function onFileChange(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;
    if (!cloudinaryReady) {
      setError("File storage is not configured.");
      return;
    }

    const selected = Array.from(fileList);
    const slots = MAX_PAYMENT_PROOFS - items.length;
    if (slots <= 0) {
      setError(`You can upload at most ${MAX_PAYMENT_PROOFS} screenshots.`);
      return;
    }

    const toUpload = selected.slice(0, slots);
    if (selected.length > slots) {
      setError(
        `Only ${slots} more screenshot${slots === 1 ? "" : "s"} allowed (max ${MAX_PAYMENT_PROOFS}).`,
      );
    }

    setUploading(true);
    try {
      const uploaded: PaymentProofMeta[] = [];
      for (const file of toUpload) {
        const signed = await requestSignature(slug, file);
        const result = await uploadToCloudinary(file, signed);
        uploaded.push({
          cloudinaryPublicId: result.public_id,
          cloudinaryResourceType: result.resource_type || signed.resourceType,
          cloudinaryDeliveryType: "authenticated",
          proofFileName: signed.fileName,
          proofMimeType: signed.mimeType,
          proofFileSize: result.bytes || signed.fileSize,
          proofFormat: result.format || "",
        });
      }
      setItems((prev) => [...prev, ...uploaded].slice(0, MAX_PAYMENT_PROOFS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <Label htmlFor="paymentProof">
        Payment screenshots{required ? " *" : ""}
      </Label>
      <p className="text-muted-foreground text-xs">
        Required for UPI, bank transfer, and other non-cash methods. Upload 1–
        {MAX_PAYMENT_PROOFS} clear screenshots or PDF confirmations.
      </p>
      <Input
        id="paymentProof"
        type="file"
        accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
        multiple
        required={required && items.length === 0}
        disabled={uploading || !cloudinaryReady || remaining === 0}
        onChange={(event) => {
          void onFileChange(event.target.files);
          event.target.value = "";
        }}
      />
      {uploading ? (
        <p className="text-muted-foreground text-xs">Uploading…</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Uploaded payment proofs">
          {items.map((item, index) => (
            <li
              key={`${item.cloudinaryPublicId}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
            >
              <span className="truncate text-emerald-500">
                {index + 1}. {item.proofFileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${item.proofFileName}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-muted-foreground text-[11px]">
        {items.length}/{MAX_PAYMENT_PROOFS} uploaded
        {remaining > 0 ? ` · ${remaining} remaining` : " · limit reached"}
      </p>
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
      {items.length > 0 ? (
        <input
          type="hidden"
          name="paymentProofsJson"
          value={JSON.stringify(items)}
        />
      ) : null}
    </div>
  );
}
