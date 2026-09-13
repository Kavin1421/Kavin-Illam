import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";
import {
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "../src/server/advances/outstanding";
import {
  buildDocumentPublicId,
  getCloudinary,
  isCloudinaryConfigured,
} from "../src/server/documents/cloudinary";
import { ensureSystemCategories } from "../src/server/finance/categories";
import {
  allocateAdvanceNumber,
  allocateDocumentNumber,
  allocateMilestoneNumber,
  allocatePaymentRequestNumber,
  allocateTaskNumber,
  allocateTransactionNumber,
} from "../src/server/finance/numbering";

/**
 * Development seed only — never run automatically in production.
 *
 * Usage:
 *   SEED_PASSWORD='...' pnpm db:seed
 */
async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    throw new Error("Refusing to seed in production without ALLOW_PROD_SEED=1");
  }

  const password = process.env.SEED_PASSWORD ?? "ChangeMeNow!12345";
  if (password.length < 8) {
    throw new Error("SEED_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await hashPassword(password);

  const kevin = await prisma.user.upsert({
    where: { email: "kevin@kavinillam.local" },
    update: {
      name: "Kevin",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
    create: {
      name: "Kevin",
      email: "kevin@kavinillam.local",
      phone: "+91 90000 00000",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: "engineer@kavinillam.local" },
    update: {
      name: "Engineer",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
    create: {
      name: "Engineer",
      email: "engineer@kavinillam.local",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await ensureSystemCategories();

  const existing = await prisma.project.findUnique({
    where: { slug: "kavin-illam" },
  });

  const project =
    existing ??
    (await prisma.project.create({
      data: {
        name: "Kavin Illam",
        slug: "kavin-illam",
        description: "Primary residential construction project",
        projectType: "RESIDENTIAL",
        address: "Tamil Nadu, India",
        currency: "INR",
        estimatedBudget: 500_000_000,
        status: "ACTIVE",
        ownerId: kevin.id,
        counters: {
          create: [
            { key: "EXP", value: 0 },
            { key: "DOC", value: 0 },
            { key: "REQ", value: 0 },
            { key: "ADV", value: 0 },
          ],
        },
      },
    }));

  if (existing && existing.ownerId !== kevin.id) {
    await prisma.project.update({
      where: { id: existing.id },
      data: { ownerId: kevin.id },
    });
  }

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: kevin.id },
    },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      projectId: project.id,
      userId: kevin.id,
      role: "OWNER",
      status: "ACTIVE",
      invitedById: kevin.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: engineer.id },
    },
    update: { role: "ENGINEER", status: "ACTIVE" },
    create: {
      projectId: project.id,
      userId: engineer.id,
      role: "ENGINEER",
      status: "ACTIVE",
      invitedById: kevin.id,
    },
  });

  let hdfc = await prisma.financialAccount.findFirst({
    where: { projectId: project.id, name: "HDFC Bank" },
  });
  if (!hdfc) {
    hdfc = await prisma.financialAccount.create({
      data: {
        projectId: project.id,
        ownerId: kevin.id,
        name: "HDFC Bank",
        type: "BANK",
        institution: "HDFC",
        maskedIdentifier: "XXXX4210",
        openingBalance: 0,
        currency: "INR",
        status: "ACTIVE",
      },
    });
  }

  let indianBank = await prisma.financialAccount.findFirst({
    where: { projectId: project.id, name: "Indian Bank" },
  });
  if (!indianBank) {
    indianBank = await prisma.financialAccount.create({
      data: {
        projectId: project.id,
        ownerId: kevin.id,
        name: "Indian Bank",
        type: "BANK",
        institution: "Indian Bank",
        openingBalance: 0,
        currency: "INR",
        status: "ACTIVE",
      },
    });
  }

  const cash = await prisma.financialAccount.findFirst({
    where: { projectId: project.id, name: "Cash" },
  });
  if (!cash) {
    await prisma.financialAccount.create({
      data: {
        projectId: project.id,
        ownerId: kevin.id,
        name: "Cash",
        type: "CASH",
        openingBalance: 0,
        currency: "INR",
        status: "ACTIVE",
      },
    });
  }

  const engineering = await prisma.category.findFirst({
    where: { code: "ENGINEERING", isSystem: true },
  });
  const cement = await prisma.category.findFirst({
    where: { code: "CEMENT", isSystem: true },
  });
  const steel = await prisma.category.findFirst({
    where: { code: "STEEL", isSystem: true },
  });
  const labour = await prisma.category.findFirst({
    where: { code: "LABOUR", isSystem: true },
  });
  const personal = await prisma.category.findFirst({
    where: { code: "PERSONAL", isSystem: true },
  });

  const existingTxCount = await prisma.financialTransaction.count({
    where: { projectId: project.id },
  });

  if (
    existingTxCount === 0 &&
    engineering &&
    cement &&
    steel &&
    labour &&
    personal &&
    hdfc
  ) {
    const samples = [
      {
        type: "ADVANCE" as const,
        amount: 50_000_000,
        categoryId: engineering.id,
        paidTo: "Engineer",
        description: "Initial engineering advance",
        visibility: "PROJECT_SHARED" as const,
        referenceNumber: "UTR123456",
      },
      {
        type: "EXPENSE" as const,
        amount: 12_500_000,
        categoryId: cement.id,
        paidTo: "Cement supplier",
        description: "Cement purchase",
        visibility: "PROJECT_SHARED" as const,
      },
      {
        type: "EXPENSE" as const,
        amount: 7_500_000,
        categoryId: steel.id,
        paidTo: "Steel supplier",
        description: "Steel purchase",
        visibility: "PROJECT_SHARED" as const,
      },
      {
        type: "EXPENSE" as const,
        amount: 5_000_000,
        categoryId: labour.id,
        paidTo: "Labour contractor",
        description: "Labour payment",
        visibility: "PROJECT_SHARED" as const,
      },
      {
        type: "EXPENSE" as const,
        amount: 4_000_000,
        categoryId: personal.id,
        paidTo: "Furniture store",
        description: "Personal furniture",
        visibility: "PRIVATE" as const,
      },
    ];

    for (const sample of samples) {
      const transactionNumber = await allocateTransactionNumber({
        projectId: project.id,
        projectSlug: project.slug,
        type: sample.type,
      });
      await prisma.financialTransaction.create({
        data: {
          projectId: project.id,
          transactionNumber,
          type: sample.type,
          direction: "OUTFLOW",
          amount: sample.amount,
          currency: "INR",
          categoryId: sample.categoryId,
          accountId: hdfc.id,
          paidByUserId: kevin.id,
          paidTo: sample.paidTo,
          transactionDate: new Date(),
          status: "PAID",
          paymentMethod: "BANK_TRANSFER",
          referenceNumber: sample.referenceNumber ?? null,
          description: sample.description,
          visibility: sample.visibility,
          allowedUserIds: [],
          createdById: kevin.id,
          approvedById: kevin.id,
          approvedAt: new Date(),
        },
      });
    }
  }

  // Backfill Advance records from ADVANCE ledger rows (Phase 6).
  const advanceTxs = await prisma.financialTransaction.findMany({
    where: {
      projectId: project.id,
      type: "ADVANCE",
      deletedAt: null,
    },
  });

  for (const tx of advanceTxs) {
    const linked = await prisma.advance.findFirst({
      where: {
        OR: [
          { fundingTransactionId: tx.id },
          { projectId: project.id, advanceNumber: tx.transactionNumber },
        ],
      },
    });
    if (linked) continue;

    const advanceNumber = await allocateAdvanceNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });

    await prisma.advance.create({
      data: {
        projectId: project.id,
        advanceNumber,
        originalAmount: tx.amount,
        currency: tx.currency,
        recipientName: tx.paidTo ?? "Engineer",
        recipientUserId: engineer.id,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        issuedAt: tx.transactionDate,
        description: tx.description,
        notes: tx.notes,
        status: "OPEN",
        visibility: tx.visibility,
        allowedUserIds: tx.allowedUserIds,
        fundingTransactionId: tx.id,
        createdById: kevin.id,
      },
    });
  }

  // Sample settlement against engineering advance (₹1,00,000 of ₹5,00,000).
  const engineeringAdvance = await prisma.advance.findFirst({
    where: {
      projectId: project.id,
      deletedAt: null,
      recipientName: "Engineer",
    },
    include: {
      settlements: { where: { deletedAt: null } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (engineeringAdvance && engineeringAdvance.settlements.length === 0) {
    const settlementAmount = 10_000_000;
    const breakdown = computeAdvanceOutstanding(
      engineeringAdvance.originalAmount,
      [],
    );
    if (settlementAmount <= breakdown.outstanding) {
      const transactionNumber = await allocateTransactionNumber({
        projectId: project.id,
        projectSlug: project.slug,
        type: "SETTLEMENT",
      });
      const ledger = await prisma.financialTransaction.create({
        data: {
          projectId: project.id,
          transactionNumber,
          type: "SETTLEMENT",
          direction: "INTERNAL",
          amount: settlementAmount,
          currency: "INR",
          categoryId: engineeringAdvance.categoryId,
          accountId: engineeringAdvance.accountId,
          paidByUserId: kevin.id,
          paidTo: engineeringAdvance.recipientName,
          transactionDate: new Date(),
          status: "PAID",
          paymentMethod: "BANK_TRANSFER",
          description: "Partial settlement against engineering advance",
          visibility: "PROJECT_SHARED",
          allowedUserIds: [],
          createdById: kevin.id,
          approvedById: kevin.id,
          approvedAt: new Date(),
        },
      });

      await prisma.advanceSettlement.create({
        data: {
          projectId: project.id,
          advanceId: engineeringAdvance.id,
          kind: "SETTLEMENT",
          amount: settlementAmount,
          currency: "INR",
          settledAt: new Date(),
          description: "Partial settlement against engineering advance",
          transactionId: ledger.id,
          createdById: kevin.id,
        },
      });

      const next = computeAdvanceOutstanding(
        engineeringAdvance.originalAmount,
        [{ kind: "SETTLEMENT", amount: settlementAmount }],
      );
      await prisma.advance.update({
        where: { id: engineeringAdvance.id },
        data: {
          status: deriveAdvanceStatus({
            originalAmount: engineeringAdvance.originalAmount,
            outstanding: next.outstanding,
          }),
        },
      });
    }
  }

  // Phase 7 — sample payment requests from engineer.
  const existingRequestCount = await prisma.paymentRequest.count({
    where: { projectId: project.id },
  });

  if (existingRequestCount === 0 && cement && steel) {
    const pendingNumber = await allocatePaymentRequestNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.paymentRequest.create({
      data: {
        projectId: project.id,
        requestNumber: pendingNumber,
        title: "Additional cement delivery",
        description: "Need 50 bags for first-floor slab",
        amount: 2_500_000,
        paidAmount: 0,
        currency: "INR",
        categoryId: cement.id,
        payeeName: "Cement supplier",
        status: "PENDING",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: engineer.id,
      },
    });

    const approvedNumber = await allocatePaymentRequestNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.paymentRequest.create({
      data: {
        projectId: project.id,
        requestNumber: approvedNumber,
        title: "Steel stirrups for columns",
        description: "Approved — ready to pay",
        amount: 3_500_000,
        paidAmount: 0,
        currency: "INR",
        categoryId: steel.id,
        accountId: hdfc?.id,
        payeeName: "Steel supplier",
        status: "APPROVED",
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: engineer.id,
        reviewedById: kevin.id,
        reviewedAt: new Date(),
        reviewNote: "Approved for payment",
      },
    });
  }

  // Phase 8 — sample authenticated Cloudinary document (when configured).
  const existingDocCount = await prisma.document.count({
    where: { projectId: project.id },
  });

  if (existingDocCount === 0 && isCloudinaryConfigured()) {
    try {
      const cld = getCloudinary();
      const publicId = buildDocumentPublicId(project.id, "site-photo");
      const uploaded = await cld.uploader.upload(
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        {
          public_id: publicId,
          type: "authenticated",
          resource_type: "image",
        },
      );

      const documentNumber = await allocateDocumentNumber({
        projectId: project.id,
        projectSlug: project.slug,
      });

      await prisma.document.create({
        data: {
          projectId: project.id,
          documentNumber,
          title: "Site progress photo",
          description: "Seeded sample (authenticated Cloudinary asset)",
          category: "PHOTO",
          tags: ["seed", "site"],
          status: "ACTIVE",
          visibility: "PROJECT_SHARED",
          allowedUserIds: [],
          currentVersion: 1,
          fileName: "site-progress.jpg",
          mimeType: "image/jpeg",
          fileSize: uploaded.bytes ?? 0,
          cloudinaryPublicId: uploaded.public_id,
          cloudinaryResourceType: uploaded.resource_type ?? "image",
          cloudinaryDeliveryType: "authenticated",
          format: uploaded.format ?? "jpg",
          createdById: kevin.id,
          uploadedById: kevin.id,
          versions: {
            create: {
              projectId: project.id,
              versionNumber: 1,
              fileName: "site-progress.jpg",
              mimeType: "image/jpeg",
              fileSize: uploaded.bytes ?? 0,
              cloudinaryPublicId: uploaded.public_id,
              cloudinaryResourceType: uploaded.resource_type ?? "image",
              cloudinaryDeliveryType: "authenticated",
              format: uploaded.format ?? "jpg",
              changeDescription: "Initial upload",
              uploadedById: kevin.id,
              isCurrent: true,
            },
          },
        },
      });
    } catch (error) {
      console.warn(
        "Skipping Cloudinary document seed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Phase 9 — active project budget with category lines.
  const existingBudget = await prisma.budget.findFirst({
    where: { projectId: project.id, status: "ACTIVE" },
  });

  if (!existingBudget) {
    const materials = await prisma.category.findFirst({
      where: { code: "MATERIALS", isSystem: true },
    });
    const misc = await prisma.category.findFirst({
      where: { code: "MISCELLANEOUS", isSystem: true },
    });

    const lines = [
      engineering && {
        categoryId: engineering.id,
        label: "Engineering",
        plannedAmount: 80_000_000,
        sortOrder: 0,
      },
      cement && {
        categoryId: cement.id,
        label: "Cement",
        plannedAmount: 40_000_000,
        sortOrder: 1,
      },
      steel && {
        categoryId: steel.id,
        label: "Steel",
        plannedAmount: 50_000_000,
        sortOrder: 2,
      },
      labour && {
        categoryId: labour.id,
        label: "Labour",
        plannedAmount: 60_000_000,
        sortOrder: 3,
      },
      materials && {
        categoryId: materials.id,
        label: "Materials",
        plannedAmount: 70_000_000,
        sortOrder: 4,
      },
      misc && {
        categoryId: misc.id,
        label: "Contingency",
        plannedAmount: 200_000_000,
        sortOrder: 5,
      },
    ].filter(Boolean) as Array<{
      categoryId: string;
      label: string;
      plannedAmount: number;
      sortOrder: number;
    }>;

    if (lines.length > 0) {
      const plannedSum = lines.reduce((s, l) => s + l.plannedAmount, 0);
      await prisma.budget.create({
        data: {
          projectId: project.id,
          name: "Kavin Illam construction budget",
          currency: "INR",
          totalPlanned: 500_000_000,
          status: "ACTIVE",
          defaultRemainingMode: "VS_PAID",
          notes: "Seeded Phase 9 budget — planned ₹50L total",
          createdById: kevin.id,
          categories: {
            create: lines.map((line) => ({
              projectId: project.id,
              categoryId: line.categoryId,
              label: line.label,
              plannedAmount: line.plannedAmount,
              sortOrder: line.sortOrder,
            })),
          },
        },
      });
      await prisma.project.update({
        where: { id: project.id },
        data: { estimatedBudget: 500_000_000 },
      });
      void plannedSum;
    }
  }

  // Phase 10 — milestones + tasks.
  const existingMilestoneCount = await prisma.milestone.count({
    where: { projectId: project.id },
  });

  if (existingMilestoneCount === 0) {
    const foundationNumber = await allocateMilestoneNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    const foundation = await prisma.milestone.create({
      data: {
        projectId: project.id,
        milestoneNumber: foundationNumber,
        title: "Foundation complete",
        description: "Excavation, footing, and plinth beam",
        status: "IN_PROGRESS",
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: kevin.id,
        sortOrder: 0,
      },
    });

    const structureNumber = await allocateMilestoneNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        milestoneNumber: structureNumber,
        title: "Structure complete",
        description: "Columns, slabs, and roof slab",
        status: "UPCOMING",
        targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: kevin.id,
        sortOrder: 1,
      },
    });

    const task1Number = await allocateTaskNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: task1Number,
        title: "Mark excavation layout",
        description: "Verify setbacks and dig lines with engineer",
        status: "DONE",
        priority: "HIGH",
        milestoneId: foundation.id,
        assigneeId: engineer.id,
        completedAt: new Date(),
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: kevin.id,
      },
    });

    const task2Number = await allocateTaskNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: task2Number,
        title: "Schedule concrete pour",
        description: "Coordinate cement, labour, and curing plan",
        status: "IN_PROGRESS",
        priority: "URGENT",
        milestoneId: foundation.id,
        assigneeId: engineer.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: kevin.id,
      },
    });

    const task3Number = await allocateTaskNumber({
      projectId: project.id,
      projectSlug: project.slug,
    });
    await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: task3Number,
        title: "Order steel for columns",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: kevin.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        visibility: "PROJECT_SHARED",
        allowedUserIds: [],
        createdById: engineer.id,
      },
    });
  }

  console.log(
    "Seeded users + project + finance + advances + payment requests + documents + budget + tasks:",
  );
  console.log(`- ${kevin.name} <${kevin.email}> OWNER`);
  console.log(`- ${engineer.name} <${engineer.email}> ENGINEER`);
  console.log(`- Project: ${project.name} (/p/${project.slug}/tasks)`);
  console.log("Password: value from SEED_PASSWORD (or local default).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
