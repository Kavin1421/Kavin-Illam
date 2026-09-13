import type { AuditAction, Prisma, Visibility } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";

const SENSITIVE_KEY =
  /password|secret|token|authorization|cookie|apikey|api_key|credential|cvv|pin/i;

export type AuditMetadata = Record<string, unknown>;

export type RecordAuditInput = {
  projectId: string;
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: AuditMetadata | null;
  ip?: string | null;
  userAgent?: string | null;
  /** When set, also writes a visibility-filtered activity feed row. */
  activity?: {
    message: string;
    href?: string | null;
    visibility?: Visibility;
    allowedUserIds?: string[];
  };
};

/** Strip secrets from nested objects before persistence or logs. */
export function sanitizeAuditMetadata(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = sanitizeAuditMetadata(nested, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}…`;
  }
  return value;
}

/**
 * Persist audit (+ optional activity). Failures are logged but never
 * fail the primary domain mutation.
 */
export async function recordAuditEvent(input: RecordAuditInput): Promise<void> {
  const metadata = input.metadata
    ? (sanitizeAuditMetadata(input.metadata) as Prisma.InputJsonValue)
    : undefined;

  try {
    await prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: metadata ?? undefined,
      },
    });

    if (input.activity) {
      const visibility = input.activity.visibility ?? "PROJECT_SHARED";
      await prisma.activity.create({
        data: {
          projectId: input.projectId,
          actorId: input.actorId,
          createdById: input.actorId,
          message: input.activity.message,
          entityType: input.entityType,
          entityId: input.entityId,
          href: input.activity.href ?? null,
          visibility,
          allowedUserIds: input.activity.allowedUserIds ?? [],
        },
      });
    }
  } catch (error) {
    logger.error("Failed to record audit event", {
      projectId: input.projectId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function actorLabel(user: {
  name?: string | null;
  email?: string | null;
}): string {
  return user.name?.trim() || user.email?.trim() || "Someone";
}
