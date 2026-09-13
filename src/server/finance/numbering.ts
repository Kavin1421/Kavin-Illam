import { projectCodeFromSlug } from "@/lib/slug";
import { prisma } from "@/server/db/prisma";

const TYPE_CODES: Record<string, string> = {
  EXPENSE: "EXP",
  INCOME: "INC",
  TRANSFER: "TRF",
  REFUND: "REF",
  ADJUSTMENT: "ADJ",
  ADVANCE: "ADV",
  SETTLEMENT: "SET",
};

export async function allocateTransactionNumber(params: {
  projectId: string;
  projectSlug: string;
  type: string;
}): Promise<string> {
  const typeCode = TYPE_CODES[params.type] ?? "TXN";
  const counterKey = `TXN_${typeCode}`;

  const counter = await prisma.projectCounter.upsert({
    where: {
      projectId_key: {
        projectId: params.projectId,
        key: counterKey,
      },
    },
    create: {
      projectId: params.projectId,
      key: counterKey,
      value: 1,
    },
    update: {
      value: { increment: 1 },
    },
  });

  const code = projectCodeFromSlug(params.projectSlug);
  const seq = String(counter.value).padStart(6, "0");
  return `${code}-${typeCode}-${seq}`;
}

/** Human-readable advance numbers (KIL-ADV-000001) — separate from TXN_ADV. */
export async function allocateAdvanceNumber(params: {
  projectId: string;
  projectSlug: string;
}): Promise<string> {
  const counter = await prisma.projectCounter.upsert({
    where: {
      projectId_key: {
        projectId: params.projectId,
        key: "ADV",
      },
    },
    create: {
      projectId: params.projectId,
      key: "ADV",
      value: 1,
    },
    update: {
      value: { increment: 1 },
    },
  });

  const code = projectCodeFromSlug(params.projectSlug);
  const seq = String(counter.value).padStart(6, "0");
  return `${code}-ADV-${seq}`;
}

/** Human-readable payment request numbers (KIL-REQ-000001). */
export async function allocatePaymentRequestNumber(params: {
  projectId: string;
  projectSlug: string;
}): Promise<string> {
  const counter = await prisma.projectCounter.upsert({
    where: {
      projectId_key: {
        projectId: params.projectId,
        key: "REQ",
      },
    },
    create: {
      projectId: params.projectId,
      key: "REQ",
      value: 1,
    },
    update: {
      value: { increment: 1 },
    },
  });

  const code = projectCodeFromSlug(params.projectSlug);
  const seq = String(counter.value).padStart(6, "0");
  return `${code}-REQ-${seq}`;
}

/** Human-readable document numbers (KIL-DOC-000001). */
export async function allocateDocumentNumber(params: {
  projectId: string;
  projectSlug: string;
}): Promise<string> {
  const counter = await prisma.projectCounter.upsert({
    where: {
      projectId_key: {
        projectId: params.projectId,
        key: "DOC",
      },
    },
    create: {
      projectId: params.projectId,
      key: "DOC",
      value: 1,
    },
    update: {
      value: { increment: 1 },
    },
  });

  const code = projectCodeFromSlug(params.projectSlug);
  const seq = String(counter.value).padStart(6, "0");
  return `${code}-DOC-${seq}`;
}
