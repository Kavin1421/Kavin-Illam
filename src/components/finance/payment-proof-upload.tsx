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

const UUID_FILE_STEM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (
    fromName &&
    fromName !== file.name.toLowerCase() &&
    fromName.length <= 5
  ) {
    return `.${fromName}`;
  }
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "application/pdf") return ".pdf";
  return ".jpg";
}

/** Prefer a human label — mobile cameras often send UUID keys as File.name. */
function friendlyProofFileName(file: File, ordinal: number): string {
  const base = (file.name.split(/[/\\]/).pop() || "").trim();
  const stem = base.replace(/\.[^.]+$/, "");
  const looksLikeKey =
    !stem ||
    UUID_FILE_STEM.test(stem) ||
    /^image$/i.test(stem) ||
    /^blob$/i.test(stem) ||
    /^untitled$/i.test(stem);

  if (looksLikeKey) {
    return `Payment-screenshot-${ordinal}${extensionForFile(file)}`;
  }

  return base.slice(0, 180); 
}

async function requestSignature(
  slug: string,
  file: File,
): Promise<SignedUpload> {
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
 * Multi-file payment screenshot upload for non-cash methods.
 * Posts `paymentProofsJson` for the parent form.
 */
export function PaymentProofUpload({
  slug,
  paymentMethod,
  cloudinaryReady,
  required = true,
  maxFiles = MAX_PAYMENT_PROOFS,
  surface = "dark",
  forceVisible = false,
}: {
  slug: string;
  paymentMethod: string;
  cloudinaryReady: boolean;
  required?: boolean;
  /** Cap uploads (Finance default 5; Home Loan uses 3). */
  maxFiles?: number;
  /** Match parent shell — paper for light MediCore cards. */
  surface?: "dark" | "paper";
  /** Show uploader even when method is cash/empty (edit append). */
  forceVisible?: boolean;
}) {
  const needsProof = Boolean(paymentMethod && paymentMethod !== "CASH");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PaymentProofMeta[]>([]);
  const cap = Math.max(1, Math.min(maxFiles, MAX_PAYMENT_PROOFS));

  if (!needsProof && !forceVisible) {
    return null;
  }

  const remaining = cap - items.length;
  const isPaper = surface === "paper";
  const shellClass = isPaper
    ? "space-y-2 rounded-xl border border-[#d8e2dc] bg-[#f8faf9] p-3"
    : "space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3";
  const itemClass = isPaper
    ? "flex items-center justify-between gap-2 rounded-lg border border-[#d8e2dc] bg-white px-2.5 py-1.5 text-xs text-[#17202a]"
    : "flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs";
  const hintClass = isPaper ? "text-xs text-[#667085]" : "text-muted-foreground text-xs";
  const metaClass = isPaper
    ? "text-[11px] text-[#667085]"
    : "text-muted-foreground text-[11px]";
  const labelClass = isPaper ? "text-[#17202a]" : undefined;
  const nameClass = isPaper
    ? "min-w-0 truncate text-[#0f6b4c]"
    : "min-w-0 truncate text-emerald-500";

  async function onFileChange(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;
    if (!cloudinaryReady) {
      setError("File storage is not configured.");
      return;
    }

    const selected = Array.from(fileList);
    const slots = cap - items.length;
    if (slots <= 0) {
      setError(`You can upload at most ${cap} screenshots.`);
      return;
    }

    const toUpload = selected.slice(0, slots);
    if (selected.length > slots) {
      setError(
        `Only ${slots} more screenshot${slots === 1 ? "" : "s"} allowed (max ${cap}).`,
      );
    }

    setUploading(true);
    try {
      const uploaded: PaymentProofMeta[] = [];
      let ordinal = items.length;
      for (const file of toUpload) {
        ordinal += 1;
        const displayName = friendlyProofFileName(file, ordinal);
        const namedFile = new File([file], displayName, {
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified,
        });
        const signed = await requestSignature(slug, namedFile);
        const result = await uploadToCloudinary(namedFile, signed);
        uploaded.push({
          cloudinaryPublicId: result.public_id,
          cloudinaryResourceType: result.resource_type || signed.resourceType,
          cloudinaryDeliveryType: "authenticated",
          proofFileName: displayName,
          proofMimeType: signed.mimeType,
          proofFileSize: result.bytes || signed.fileSize,
          proofFormat: result.format || "",
        });
      }
      setItems((prev) => [...prev, ...uploaded].slice(0, cap));
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
    <div className={shellClass}>
      <Label htmlFor="paymentProof" className={labelClass}>
        Payment screenshots{required ? " *" : ""}
      </Label>
      <p className={hintClass}>
        {forceVisible && !needsProof
          ? `Optional. Upload up to ${cap} clear screenshot${cap === 1 ? "" : "s"} or PDF confirmation${cap === 1 ? "" : "s"}.`
          : `Required for UPI, bank transfer, and other non-cash methods. Upload 1–${cap} clear screenshots or PDF confirmations.`}
      </p>
      <Input
        id="paymentProof"
        type="file"
        accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
        multiple
        required={required && items.length === 0}
        disabled={uploading || !cloudinaryReady || remaining === 0}
        className={
          isPaper
            ? "border-[#cfd9d3] bg-white text-[#17202a] file:mr-3 file:rounded-md file:border-0 file:bg-[#e8f5ef] file:px-2 file:py-1 file:text-[#0f6b4c]"
            : undefined
        }
        onChange={(event) => {
          void onFileChange(event.target.files);
          event.target.value = "";
        }}
      />
      {uploading ? <p className={hintClass}>Uploading…</p> : null}
      {items.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Uploaded payment proofs">
          {items.map((item, index) => (
            <li
              key={`${item.cloudinaryPublicId}-${index}`}
              className={itemClass}
            >
              <span className={nameClass} title={item.proofFileName}>
                {index + 1}. {item.proofFileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={isPaper ? "text-[#667085]" : undefined}
                onClick={() => removeAt(index)}
                aria-label={`Remove ${item.proofFileName}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={metaClass}>
        {items.length}/{cap} uploaded
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
