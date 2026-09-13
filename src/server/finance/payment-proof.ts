import type { DocumentCategory, Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  assertOwnedPublicId,
} from "@/server/documents/cloudinary";
import { validateUploadFile } from "@/server/documents/validation";
import { allocateDocumentNumber } from "@/server/finance/numbering";
import { prisma } from "@/server/db/prisma";
import {
  hasPaymentProofUpload,
  paymentMethodRequiresProof,
  type PaymentProofUpload,
} from "@/validators/payment-proof";

type ProjectActor = {
  projectId: string;
  projectSlug: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
};

/**
 * Creates a PAYMENT_PROOF document from Cloudinary upload fields when the
 * payment method is not cash. Returns null for cash / missing method.
 */
export async function resolvePaymentProofDocumentId(params: {
  actor: ProjectActor;
  paymentMethod?: string | null;
  proof: PaymentProofUpload;
  visibility: Visibility;
  title: string;
  description?: string | null;
}): Promise<string | null> {
  if (!paymentMethodRequiresProof(params.paymentMethod)) {
    return null;
  }

  if (!hasPaymentProofUpload(params.proof)) {
    throw new AppError(
      "VALIDATION",
      "Upload a payment screenshot when the payment method is not cash.",
    );
  }

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

  const document = await prisma.document.create({
    data: {
      projectId: params.actor.projectId,
      documentNumber,
      title: params.title.slice(0, 160),
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
 * Links a proof document onto a ledger row.
 * Uses an unchecked scalar write so Prisma `$extends` Exact<> typing does not
 * reject the newly added `proofDocumentId` field.
 */
export async function linkTransactionProofDocument(
  transactionId: string,
  proofDocumentId: string,
): Promise<void> {
  // Prisma `$extends` wraps writes in Exact<>; after adding proofDocumentId the
  // extended client types can reject the new scalar until a full TS restart.
  // Runtime client + generated UncheckedUpdateInput both accept this field.
  await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: { proofDocumentId },
  } as Parameters<typeof prisma.financialTransaction.update>[0]);
}

