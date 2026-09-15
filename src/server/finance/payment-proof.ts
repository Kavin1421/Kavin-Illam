import type { DocumentCategory, Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import { assertOwnedPublicId } from "@/server/documents/cloudinary";
import { validateUploadFile } from "@/server/documents/validation";
import { allocateDocumentNumber } from "@/server/finance/numbering";
import { prisma } from "@/server/db/prisma";
import {
  extractPaymentProofs,
  paymentMethodRequiresProof,
  type PaymentProofItem,
  type PaymentProofUpload,
} from "@/validators/payment-proof";

type ProjectActor = {
  projectId: string;
  projectSlug: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
};

async function createPaymentProofDocument(params: {
  actor: ProjectActor;
  proof: PaymentProofItem;
  visibility: Visibility;
  title: string;
  description?: string | null;
  index: number;
  total: number;
}): Promise<string> {
  try {
    validateUploadFile({
      fileName: params.proof.proofFileName,
      mimeType: params.proof.proofMimeType,
      fileSize: params.proof.proofFileSize,
    });
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid payment proof file.",
    );
  }

  assertOwnedPublicId(params.actor.projectId, params.proof.cloudinaryPublicId);

  const documentNumber = await allocateDocumentNumber({
    projectId: params.actor.projectId,
    projectSlug: params.actor.projectSlug,
  });

  const suffix =
    params.total > 1 ? ` (${params.index + 1}/${params.total})` : "";

  const document = await prisma.document.create({
    data: {
      projectId: params.actor.projectId,
      documentNumber,
      title: `${params.title.slice(0, 140)}${suffix}`.slice(0, 160),
      description: params.description || null,
      category: "PAYMENT_PROOF" as DocumentCategory,
      tags: ["payment-proof"],
      status: "ACTIVE",
      visibility: params.visibility,
      allowedUserIds: [],
      currentVersion: 1,
      fileName: params.proof.proofFileName,
      mimeType: params.proof.proofMimeType,
      fileSize: params.proof.proofFileSize,
      cloudinaryPublicId: params.proof.cloudinaryPublicId,
      cloudinaryResourceType: params.proof.cloudinaryResourceType,
      cloudinaryDeliveryType:
        params.proof.cloudinaryDeliveryType || "authenticated",
      format: params.proof.proofFormat || null,
      createdById: params.actor.userId,
      uploadedById: params.actor.userId,
      versions: {
        create: {
          projectId: params.actor.projectId,
          versionNumber: 1,
          fileName: params.proof.proofFileName,
          mimeType: params.proof.proofMimeType,
          fileSize: params.proof.proofFileSize,
          cloudinaryPublicId: params.proof.cloudinaryPublicId,
          cloudinaryResourceType: params.proof.cloudinaryResourceType,
          cloudinaryDeliveryType:
            params.proof.cloudinaryDeliveryType || "authenticated",
          format: params.proof.proofFormat || null,
          changeDescription: "Payment proof",
          uploadedById: params.actor.userId,
          isCurrent: true,
        },
      },
    },
  });

  logger.info("Payment proof document created", {
    projectId: params.actor.projectId,
    documentId: document.id,
    actorId: params.actor.userId,
    index: params.index,
  });

  await recordAuditEvent({
    projectId: params.actor.projectId,
    actorId: params.actor.userId,
    action: "UPLOAD",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      documentNumber: document.documentNumber,
      category: document.category,
      linkedAs: "payment-proof",
    },
    activity: {
      message: `${actorLabel({
        name: params.actor.userName,
        email: params.actor.userEmail,
      })} uploaded payment proof (${document.documentNumber}).`,
      href: `/p/${params.actor.projectSlug}/documents/${document.id}`,
      visibility: params.visibility,
    },
  });

  return document.id;
}

/**
 * Creates 1–5 PAYMENT_PROOF documents from uploaded Cloudinary fields.
 * Returns [] for cash / missing method.
 */
export async function resolvePaymentProofDocumentIds(params: {
  actor: ProjectActor;
  paymentMethod?: string | null;
  proof: PaymentProofUpload;
  visibility: Visibility;
  title: string;
  description?: string | null;
}): Promise<string[]> {
  if (!paymentMethodRequiresProof(params.paymentMethod)) {
    return [];
  }

  let proofs: PaymentProofItem[];
  try {
    proofs = extractPaymentProofs(params.proof);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error
        ? error.message
        : "Upload valid payment screenshots.",
    );
  }

  if (proofs.length === 0) {
    throw new AppError(
      "VALIDATION",
      "Upload at least one payment screenshot when the payment method is not cash.",
    );
  }

  const ids: string[] = [];
  for (let index = 0; index < proofs.length; index += 1) {
    const proof = proofs[index];
    if (!proof) continue;
    const id = await createPaymentProofDocument({
      actor: params.actor,
      proof,
      visibility: params.visibility,
      title: params.title,
      description: params.description,
      index,
      total: proofs.length,
    });
    ids.push(id);
  }

  return ids;
}

/** @deprecated Prefer resolvePaymentProofDocumentIds — kept for single-id call sites. */
export async function resolvePaymentProofDocumentId(params: {
  actor: ProjectActor;
  paymentMethod?: string | null;
  proof: PaymentProofUpload;
  visibility: Visibility;
  title: string;
  description?: string | null;
}): Promise<string | null> {
  const ids = await resolvePaymentProofDocumentIds(params);
  return ids[0] ?? null;
}

/**
 * Links proof documents onto a ledger row.
 * Primary id stays on proofDocumentId; full list on proofDocumentIds.
 */
export async function linkTransactionProofDocuments(
  transactionId: string,
  proofDocumentIds: string[],
): Promise<void> {
  if (proofDocumentIds.length === 0) return;

  await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: {
      proofDocumentId: proofDocumentIds[0],
      proofDocumentIds,
    },
  } as Parameters<typeof prisma.financialTransaction.update>[0]);
}

/**
 * Links a single proof document (backward-compatible helper).
 */
export async function linkTransactionProofDocument(
  transactionId: string,
  proofDocumentId: string,
): Promise<void> {
  await linkTransactionProofDocuments(transactionId, [proofDocumentId]);
}
