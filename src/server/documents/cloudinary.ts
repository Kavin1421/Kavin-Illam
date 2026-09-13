import { v2 as cloudinary } from "cloudinary";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

let configured = false;

export function assertCloudinaryConfigured() {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      "INTERNAL",
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
}

export function getCloudinary() {
  assertCloudinaryConfigured();
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET,
  );
}

/** Folder prefix for a project — clients may only upload under this prefix. */
export function projectDocumentFolder(projectId: string): string {
  return `kavin-illam/${projectId}/documents`;
}

export function buildDocumentPublicId(
  projectId: string,
  fileStem: string,
): string {
  const safe = fileStem
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${projectDocumentFolder(projectId)}/${safe || "file"}-${unique}`;
}

export function assertOwnedPublicId(projectId: string, publicId: string): void {
  const prefix = `${projectDocumentFolder(projectId)}/`;
  if (!publicId.startsWith(prefix)) {
    throw new AppError("VALIDATION", "Invalid Cloudinary public ID.");
  }
}

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  folder: string;
  type: "authenticated";
  resourceType: "image" | "raw" | "video" | "auto";
  signature: string;
  uploadUrl: string;
};

/**
 * Server-signed upload params for direct browser upload.
 * Secret never leaves the server.
 * public_id includes the folder path — do not also send `folder` (avoids double prefix).
 */
export function createSignedUploadParams(params: {
  projectId: string;
  publicId: string;
  resourceType: "image" | "raw" | "video" | "auto";
}): SignedUploadParams {
  const cld = getCloudinary();
  assertOwnedPublicId(params.projectId, params.publicId);

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = projectDocumentFolder(params.projectId);
  const toSign = {
    public_id: params.publicId,
    timestamp,
    type: "authenticated",
  };

  const signature = cld.utils.api_sign_request(
    toSign,
    env.CLOUDINARY_API_SECRET!,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    publicId: params.publicId,
    folder,
    type: "authenticated",
    resourceType: params.resourceType,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${params.resourceType}/upload`,
  };
}

const DEFAULT_URL_TTL_SECONDS = 5 * 60;

/**
 * Short-lived signed delivery URL for authenticated assets.
 * Issued only after server-side authorization.
 */
export function createSignedDeliveryUrl(params: {
  publicId: string;
  resourceType: string;
  deliveryType?: string;
  format?: string | null;
  ttlSeconds?: number;
  forDownload?: boolean;
}): { url: string; expiresAt: Date } {
  const cld = getCloudinary();
  const ttl = params.ttlSeconds ?? DEFAULT_URL_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const type = params.deliveryType || "authenticated";

  // Authenticated assets require sign_url. Prefer private_download_url for downloads
  // (time-bound API download endpoint).
  if (params.forDownload) {
    const format = params.format || "bin";
    const url = cld.utils.private_download_url(params.publicId, format, {
      resource_type: params.resourceType,
      type,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      attachment: true,
    });
    return { url, expiresAt };
  }

  const url = cld.url(params.publicId, {
    resource_type: params.resourceType,
    type,
    sign_url: true,
    secure: true,
    ...(params.format ? { format: params.format } : {}),
  });

  return { url, expiresAt };
}
