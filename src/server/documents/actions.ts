"use server";

import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import {
  addDocumentVersion,
  archiveDocument,
  createDocument,
  issueDocumentUrl,
  restoreDocumentVersion,
} from "@/server/documents/service";

export type DocumentActionState = {
  error?: string;
  success?: string;
  url?: string;
  expiresAt?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createDocumentAction(
  slug: string,
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    const document = await createDocument(slug, formObject(formData));
    redirect(`/p/${slug}/documents/${document.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function addDocumentVersionAction(
  slug: string,
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    const document = await addDocumentVersion(slug, formObject(formData));
    redirect(`/p/${slug}/documents/${document.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function restoreDocumentVersionAction(
  slug: string,
  documentId: string,
  formData: FormData,
): Promise<void> {
  await restoreDocumentVersion(slug, documentId, formObject(formData));
  redirect(`/p/${slug}/documents/${documentId}`);
}

export async function archiveDocumentAction(
  slug: string,
  documentId: string,
): Promise<void> {
  await archiveDocument(slug, documentId);
  redirect(`/p/${slug}/documents`);
}

export async function issueDocumentUrlAction(
  slug: string,
  documentId: string,
  download: boolean,
  versionId?: string,
): Promise<DocumentActionState> {
  try {
    const issued = await issueDocumentUrl(slug, documentId, {
      download,
      versionId,
    });
    return {
      success: download ? "Download ready." : "Preview ready.",
      url: issued.url,
      expiresAt: issued.expiresAt.toISOString(),
    };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
