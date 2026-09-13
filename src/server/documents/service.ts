import type { DocumentCategory, Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  assertCanViewProjectResource,
  canViewResource,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { allocateDocumentNumber } from "@/server/finance/numbering";
import { assertRateLimit, rateLimitKey } from "@/server/auth/rate-limit";
import {
  createDocumentSchema,
  addDocumentVersionSchema,
  restoreDocumentVersionSchema,
  signUploadSchema,
} from "@/validators/documents";

import {
  assertOwnedPublicId,
  buildDocumentPublicId,
  createSignedDeliveryUrl,
  createSignedUploadParams,
  isCloudinaryConfigured,
} from "./cloudinary";
import { canPreviewInline, validateUploadFile } from "./validation";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
  archivedAt?: Date | null;
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds,
    deletedAt: row.archivedAt ?? null,
  };
}

function parseOptionalDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("VALIDATION", "Invalid date.");
  }
  return date;
}

function parseTags(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function listDocuments(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_VIEW");

  const rows = await prisma.document.findMany({
    where: { projectId: ctx.project.id, status: "ACTIVE" },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const authorized = rows.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  return {
    project: ctx.project,
    role: ctx.role,
    documents: authorized,
    cloudinaryReady: isCloudinaryConfigured(),
  };
}

export async function getDocument(slug: string, documentId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_VIEW");

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId: ctx.project.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      },
      access: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(document),
  );

  return {
    project: ctx.project,
    role: ctx.role,
    document,
    canPreview: canPreviewInline(
      document.mimeType,
      document.cloudinaryResourceType,
    ),
  };
}

export async function prepareDocumentUpload(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_UPLOAD");
  const limit = assertRateLimit(
    rateLimitKey("doc-sign", `${ctx.user.id}:${ctx.project.id}`),
    30,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError(
      "RATE_LIMITED",
      `Too many upload attempts. Try again in ${limit.retryAfterSec}s.`,
    );
  }

  const parsed = signUploadSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid upload request.");
  }

  let validated;
  try {
    validated = validateUploadFile(parsed.data);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid file.",
    );
  }

  if (parsed.data.documentId) {
    const existing = await prisma.document.findFirst({
      where: {
        id: parsed.data.documentId,
        projectId: ctx.project.id,
        status: "ACTIVE",
      },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Document was not found.");
    }
    await assertCanViewProjectResource(
      ctx.project.id,
      ctx.user.id,
      toVisibleResource(existing),
    );
  }

  const stem = validated.fileName.replace(/\.[^.]+$/, "");
  const publicId = buildDocumentPublicId(ctx.project.id, stem);
  const signed = createSignedUploadParams({
    projectId: ctx.project.id,
    publicId,
    resourceType: validated.resourceType,
  });

  return {
    ...signed,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    fileSize: validated.fileSize,
  };
}

export async function createDocument(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_UPLOAD");
  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the document details.");
  }

  try {
    validateUploadFile({
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
    });
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid file.",
    );
  }

  assertOwnedPublicId(ctx.project.id, parsed.data.cloudinaryPublicId);

  const documentNumber = await allocateDocumentNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const document = await prisma.document.create({
    data: {
      projectId: ctx.project.id,
      documentNumber,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category as DocumentCategory,
      tags: parseTags(parsed.data.tags),
      status: "ACTIVE",
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      currentVersion: 1,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      cloudinaryPublicId: parsed.data.cloudinaryPublicId,
      cloudinaryResourceType: parsed.data.cloudinaryResourceType,
      cloudinaryDeliveryType: parsed.data.cloudinaryDeliveryType,
      format: parsed.data.format || null,
      issueDate: parseOptionalDate(parsed.data.issueDate),
      expiryDate: parseOptionalDate(parsed.data.expiryDate),
      createdById: ctx.user.id,
      uploadedById: ctx.user.id,
      versions: {
        create: {
          projectId: ctx.project.id,
          versionNumber: 1,
          fileName: parsed.data.fileName,
          mimeType: parsed.data.mimeType,
          fileSize: parsed.data.fileSize,
          cloudinaryPublicId: parsed.data.cloudinaryPublicId,
          cloudinaryResourceType: parsed.data.cloudinaryResourceType,
          cloudinaryDeliveryType: parsed.data.cloudinaryDeliveryType,
          format: parsed.data.format || null,
          changeDescription: "Initial upload",
          uploadedById: ctx.user.id,
          isCurrent: true,
        },
      },
    },
  });

  logger.info("Document created", {
    projectId: ctx.project.id,
    documentId: document.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPLOAD",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      documentNumber: document.documentNumber,
      category: document.category,
      visibility: document.visibility,
    },
    activity: {
      message: `${actorLabel(ctx.user)} uploaded ${document.title} (${document.documentNumber}).`,
      href: `/p/${slug}/documents/${document.id}`,
      visibility: document.visibility,
    },
  });

  return document;
}

export async function addDocumentVersion(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_UPLOAD");
  const parsed = addDocumentVersionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid version upload.");
  }

  try {
    validateUploadFile({
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
    });
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid file.",
    );
  }

  assertOwnedPublicId(ctx.project.id, parsed.data.cloudinaryPublicId);

  const document = await prisma.document.findFirst({
    where: {
      id: parsed.data.documentId,
      projectId: ctx.project.id,
      status: "ACTIVE",
    },
  });
  if (!document) {
    throw new AppError("NOT_FOUND", "Document was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(document),
  );

  const nextVersion = document.currentVersion + 1;

  await prisma.documentVersion.updateMany({
    where: { documentId: document.id, isCurrent: true },
    data: { isCurrent: false },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      projectId: ctx.project.id,
      versionNumber: nextVersion,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      cloudinaryPublicId: parsed.data.cloudinaryPublicId,
      cloudinaryResourceType: parsed.data.cloudinaryResourceType,
      cloudinaryDeliveryType: parsed.data.cloudinaryDeliveryType,
      format: parsed.data.format || null,
      changeDescription: parsed.data.changeDescription || "Replaced file",
      uploadedById: ctx.user.id,
      isCurrent: true,
    },
  });

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      currentVersion: nextVersion,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      cloudinaryPublicId: parsed.data.cloudinaryPublicId,
      cloudinaryResourceType: parsed.data.cloudinaryResourceType,
      cloudinaryDeliveryType: parsed.data.cloudinaryDeliveryType,
      format: parsed.data.format || null,
      uploadedById: ctx.user.id,
    },
  });

  logger.info("Document version added", {
    projectId: ctx.project.id,
    documentId: document.id,
    version: nextVersion,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPLOAD",
    entityType: "Document",
    entityId: document.id,
    metadata: { version: nextVersion, documentNumber: document.documentNumber },
    activity: {
      message: `${actorLabel(ctx.user)} uploaded version ${nextVersion} of ${document.title}.`,
      href: `/p/${slug}/documents/${document.id}`,
      visibility: document.visibility,
    },
  });

  return updated;
}

export async function restoreDocumentVersion(
  slug: string,
  documentId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_EDIT");
  const parsed = restoreDocumentVersionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid restore request.");
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId: ctx.project.id, status: "ACTIVE" },
  });
  if (!document) {
    throw new AppError("NOT_FOUND", "Document was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(document),
  );

  const version = await prisma.documentVersion.findFirst({
    where: {
      id: parsed.data.versionId,
      documentId: document.id,
      projectId: ctx.project.id,
    },
  });
  if (!version) {
    throw new AppError("NOT_FOUND", "Version was not found.");
  }

  const nextVersion = document.currentVersion + 1;

  await prisma.documentVersion.updateMany({
    where: { documentId: document.id, isCurrent: true },
    data: { isCurrent: false },
  });

  // Restore = new version pointing at prior Cloudinary asset (no silent overwrite)
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      projectId: ctx.project.id,
      versionNumber: nextVersion,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      cloudinaryPublicId: version.cloudinaryPublicId,
      cloudinaryResourceType: version.cloudinaryResourceType,
      cloudinaryDeliveryType: version.cloudinaryDeliveryType,
      format: version.format,
      changeDescription: `Restored from v${version.versionNumber}`,
      uploadedById: ctx.user.id,
      isCurrent: true,
    },
  });

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      currentVersion: nextVersion,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      cloudinaryPublicId: version.cloudinaryPublicId,
      cloudinaryResourceType: version.cloudinaryResourceType,
      cloudinaryDeliveryType: version.cloudinaryDeliveryType,
      format: version.format,
      uploadedById: ctx.user.id,
    },
  });

  logger.info("Document version restored", {
    projectId: ctx.project.id,
    documentId: document.id,
    fromVersion: version.versionNumber,
    toVersion: nextVersion,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "RESTORE_VERSION",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      fromVersion: version.versionNumber,
      toVersion: nextVersion,
    },
    activity: {
      message: `${actorLabel(ctx.user)} restored ${document.title} to version ${version.versionNumber}.`,
      href: `/p/${slug}/documents/${document.id}`,
      visibility: document.visibility,
    },
  });

  return updated;
}

export async function issueDocumentUrl(
  slug: string,
  documentId: string,
  opts?: { download?: boolean; versionId?: string },
) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_VIEW");

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId: ctx.project.id },
  });
  if (!document) {
    throw new AppError("NOT_FOUND", "Document was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(document),
  );

  let publicId = document.cloudinaryPublicId;
  let resourceType = document.cloudinaryResourceType;
  let deliveryType = document.cloudinaryDeliveryType;
  let format = document.format;
  let fileName = document.fileName;

  if (opts?.versionId) {
    const version = await prisma.documentVersion.findFirst({
      where: {
        id: opts.versionId,
        documentId: document.id,
        projectId: ctx.project.id,
      },
    });
    if (!version) {
      throw new AppError("NOT_FOUND", "Version was not found.");
    }
    publicId = version.cloudinaryPublicId;
    resourceType = version.cloudinaryResourceType;
    deliveryType = version.cloudinaryDeliveryType;
    format = version.format;
    fileName = version.fileName;
  }

  const issued = createSignedDeliveryUrl({
    publicId,
    resourceType,
    deliveryType,
    format,
    forDownload: Boolean(opts?.download),
  });

  logger.info("Document URL issued", {
    projectId: ctx.project.id,
    documentId: document.id,
    actorId: ctx.user.id,
    download: Boolean(opts?.download),
  });

  if (opts?.download) {
    await recordAuditEvent({
      projectId: ctx.project.id,
      actorId: ctx.user.id,
      action: "DOWNLOAD",
      entityType: "Document",
      entityId: document.id,
      metadata: {
        documentNumber: document.documentNumber,
        versionId: opts.versionId ?? null,
      },
    });
  }

  return { ...issued, fileName };
}

export async function archiveDocument(slug: string, documentId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "DOCUMENT_DELETE");

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId: ctx.project.id, status: "ACTIVE" },
  });
  if (!document) {
    throw new AppError("NOT_FOUND", "Document was not found.");
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "ARCHIVE",
    entityType: "Document",
    entityId: document.id,
    metadata: { documentNumber: document.documentNumber },
    activity: {
      message: `${actorLabel(ctx.user)} archived ${document.title}.`,
      href: `/p/${slug}/documents/${document.id}`,
      visibility: document.visibility,
    },
  });

  return updated;
}
