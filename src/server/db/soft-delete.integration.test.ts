/**
 * Integration: Prisma MongoDB soft-delete null vs unset.
 * Requires DATABASE_URL (or MONGO_URL). Skips when absent.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(
  process.env.DATABASE_URL?.trim() || process.env.MONGO_URL?.trim(),
);

describe.skipIf(!hasDb)("soft-delete Mongo filters (integration)", () => {
  const suffix = `${Date.now()}`;
  let ownerId = "";
  let projectId = "";
  let advanceUnsetId = "";
  let advanceNullId = "";
  let advanceDeletedId = "";
  let txUnsetId = "";
  let txDeletedId = "";
  let requestUnsetId = "";
  let requestDeletedId = "";

  let prisma: typeof import("@/server/db/prisma").prisma;

  beforeAll(async () => {
    ({ prisma } = await import("@/server/db/prisma"));

    const owner = await prisma.user.create({
      data: {
        email: `soft-del.${suffix}@test.local`,
        name: "Soft Delete Owner",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });
    ownerId = owner.id;

    const project = await prisma.project.create({
      data: {
        name: `Soft Delete ${suffix}`,
        slug: `soft-del-${suffix}`,
        ownerId,
        status: "ACTIVE",
        currency: "INR",
        projectType: "RESIDENTIAL",
        members: {
          create: [{ userId: ownerId, role: "OWNER", status: "ACTIVE" }],
        },
      },
    });
    projectId = project.id;

    async function createAdvanceFundingTx(label: string, amount: number) {
      return prisma.financialTransaction.create({
        data: {
          projectId,
          transactionNumber: `TX-FUND-${label}-${suffix}`,
          type: "ADVANCE",
          direction: "OUTFLOW",
          amount,
          currency: "INR",
          transactionDate: new Date(),
          status: "PAID",
          visibility: "PROJECT_SHARED",
          allowedUserIds: [],
          createdById: ownerId,
        },
      });
    }

    const fundingUnset = await createAdvanceFundingTx("unset", 1_000_00);
    const fundingNull = await createAdvanceFundingTx("null", 2_000_00);
    const fundingDeleted = await createAdvanceFundingTx("del", 3_000_00);

    const advanceUnset = await prisma.advance.create({
      data: {
        projectId,
        advanceNumber: `ADV-UNSET-${suffix}`,
        originalAmount: 1_000_00,
        currency: "INR",
        recipientName: "Unset Field",
        issuedAt: new Date(),
        status: "OPEN",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
        fundingTransactionId: fundingUnset.id,
      },
    });
    advanceUnsetId = advanceUnset.id;

    const advanceNull = await prisma.advance.create({
      data: {
        projectId,
        advanceNumber: `ADV-NULL-${suffix}`,
        originalAmount: 2_000_00,
        currency: "INR",
        recipientName: "Explicit Null",
        issuedAt: new Date(),
        status: "OPEN",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
        fundingTransactionId: fundingNull.id,
        deletedAt: null,
      },
    });
    advanceNullId = advanceNull.id;

    const advanceDeleted = await prisma.advance.create({
      data: {
        projectId,
        advanceNumber: `ADV-DEL-${suffix}`,
        originalAmount: 3_000_00,
        currency: "INR",
        recipientName: "Soft Deleted",
        issuedAt: new Date(),
        status: "CANCELLED",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
        fundingTransactionId: fundingDeleted.id,
        deletedAt: new Date(),
        deletedById: ownerId,
        deletionReason: "integration test",
      },
    });
    advanceDeletedId = advanceDeleted.id;

    const txUnset = await prisma.financialTransaction.create({
      data: {
        projectId,
        transactionNumber: `TX-UNSET-${suffix}`,
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 1_000_00,
        currency: "INR",
        transactionDate: new Date(),
        status: "PAID",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
      },
    });
    txUnsetId = txUnset.id;

    const txDeleted = await prisma.financialTransaction.create({
      data: {
        projectId,
        transactionNumber: `TX-DEL-${suffix}`,
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 500_00,
        currency: "INR",
        transactionDate: new Date(),
        status: "PAID",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
        deletedAt: new Date(),
        deletedById: ownerId,
        deletionReason: "integration test",
      },
    });
    txDeletedId = txDeleted.id;

    const requestUnset = await prisma.paymentRequest.create({
      data: {
        projectId,
        requestNumber: `PR-UNSET-${suffix}`,
        title: "Unset deletedAt",
        amount: 4_000_00,
        paidAmount: 0,
        currency: "INR",
        status: "PENDING",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
      },
    });
    requestUnsetId = requestUnset.id;

    const requestDeleted = await prisma.paymentRequest.create({
      data: {
        projectId,
        requestNumber: `PR-DEL-${suffix}`,
        title: "Soft deleted request",
        amount: 5_000_00,
        paidAmount: 0,
        currency: "INR",
        status: "REJECTED",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
        deletedAt: new Date(),
      },
    });
    requestDeletedId = requestDeleted.id;

    const settleActiveTx = await prisma.financialTransaction.create({
      data: {
        projectId,
        transactionNumber: `TX-SET-A-${suffix}`,
        type: "SETTLEMENT",
        direction: "INFLOW",
        amount: 100_00,
        currency: "INR",
        transactionDate: new Date(),
        status: "PAID",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
      },
    });
    const settleDeletedTx = await prisma.financialTransaction.create({
      data: {
        projectId,
        transactionNumber: `TX-SET-D-${suffix}`,
        type: "SETTLEMENT",
        direction: "INFLOW",
        amount: 50_00,
        currency: "INR",
        transactionDate: new Date(),
        status: "PAID",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: ownerId,
      },
    });

    await prisma.advanceSettlement.create({
      data: {
        projectId,
        advanceId: advanceUnsetId,
        kind: "SETTLEMENT",
        amount: 100_00,
        currency: "INR",
        settledAt: new Date(),
        createdById: ownerId,
        transactionId: settleActiveTx.id,
      },
    });
    await prisma.advanceSettlement.create({
      data: {
        projectId,
        advanceId: advanceUnsetId,
        kind: "SETTLEMENT",
        amount: 50_00,
        currency: "INR",
        settledAt: new Date(),
        createdById: ownerId,
        transactionId: settleDeletedTx.id,
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.advanceSettlement.deleteMany({ where: { projectId } });
    await prisma.advance.deleteMany({ where: { projectId } });
    await prisma.financialTransaction.deleteMany({ where: { projectId } });
    await prisma.paymentRequest.deleteMany({ where: { projectId } });
    await prisma.projectMember.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  it("naive deletedAt:null finds unset and explicit-null advances (extension)", async () => {
    const rows = await prisma.advance.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(advanceUnsetId);
    expect(ids).toContain(advanceNullId);
    expect(ids).not.toContain(advanceDeletedId);
  });

  it("excludes soft-deleted advances from active lists", async () => {
    const row = await prisma.advance.findFirst({
      where: { id: advanceDeletedId, deletedAt: null },
    });
    expect(row).toBeNull();
  });

  it("nested settlement where excludes soft-deleted settlements", async () => {
    const advance = await prisma.advance.findFirst({
      where: { id: advanceUnsetId, deletedAt: null },
      include: {
        settlements: {
          where: { deletedAt: null },
          select: { amount: true, deletedAt: true },
        },
      },
    });
    expect(advance).not.toBeNull();
    expect(advance?.settlements).toHaveLength(1);
    expect(advance?.settlements[0]?.amount).toBe(100_00);
  });

  it("naive deletedAt:null finds unset transactions and skips deleted", async () => {
    const rows = await prisma.financialTransaction.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(txUnsetId);
    expect(ids).not.toContain(txDeletedId);
  });

  it("naive deletedAt:null finds unset payment requests and skips deleted", async () => {
    const rows = await prisma.paymentRequest.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(requestUnsetId);
    expect(ids).not.toContain(requestDeletedId);
  });

  it("update data.deletedAt null still clears a soft-delete", async () => {
    await prisma.advance.update({
      where: { id: advanceDeletedId },
      data: { deletedAt: null, status: "OPEN" },
    });
    const restored = await prisma.advance.findFirst({
      where: { id: advanceDeletedId, deletedAt: null },
    });
    expect(restored).not.toBeNull();
    expect(restored?.status).toBe("OPEN");

    await prisma.advance.update({
      where: { id: advanceDeletedId },
      data: {
        deletedAt: new Date(),
        status: "CANCELLED",
        deletionReason: "re-delete after restore test",
      },
    });
  });
});
