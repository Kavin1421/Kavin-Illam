import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";
import { notDeleted } from "../src/server/db/soft-delete";
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
        estimatedBudget: 392_000_000,
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
      ...notDeleted,
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
      ...notDeleted,
      recipientName: "Engineer",
    },
    include: {
      settlements: { where: { ...notDeleted } },
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

  // Phase 9 — stage-wise payment schedule (₹39,20,000 contract).
  const PAYMENT_STAGES = [
    {
      title: "Mobility advance up to basement",
      pct: 20,
      amount: 78_400_000,
    },
    {
      title: "Advance up to Ground Floor (GF) roof concrete",
      pct: 25,
      amount: 98_000_000,
    },
    {
      title: "Advance for First Floor (FF) roof concrete",
      pct: 10,
      amount: 39_200_000,
    },
    {
      title:
        "Advance for inner plastering, electrical, plumbing and tile laying",
      pct: 25,
      amount: 98_000_000,
    },
    {
      title: "Advance for outer plastering",
      pct: 15,
      amount: 58_800_000,
    },
    {
      title: "Painting and final-stage payment",
      pct: 5,
      amount: 19_600_000,
    },
  ] as const;
  const CONTRACT_TOTAL_PAISE = 392_000_000;

  const existingBudget = await prisma.budget.findFirst({
    where: { projectId: project.id, status: "ACTIVE" },
  });

  if (!existingBudget) {
    await prisma.budget.create({
      data: {
        projectId: project.id,
        name: "Stage-wise payment schedule",
        currency: "INR",
        totalPlanned: CONTRACT_TOTAL_PAISE,
        status: "ACTIVE",
        defaultRemainingMode: "VS_PAID",
        notes:
          "Payment Terms Summary — 100% across 6 construction milestones. Payments progressive upon reaching each stage.",
        createdById: kevin.id,
        categories: {
          create: PAYMENT_STAGES.map((stage, i) => ({
            projectId: project.id,
            label: `${i + 1}. ${stage.title} (${stage.pct}%)`,
            plannedAmount: stage.amount,
            sortOrder: i,
            notes: `Stage ${i + 1} · ${stage.pct}%`,
          })),
        },
      },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { estimatedBudget: CONTRACT_TOTAL_PAISE },
    });
  }

  // Phase 10 — milestones + tasks.
  const existingMilestoneCount = await prisma.milestone.count({
    where: { projectId: project.id },
  });

  if (existingMilestoneCount === 0) {
    const createdMilestones = [];
    for (let i = 0; i < PAYMENT_STAGES.length; i++) {
      const stage = PAYMENT_STAGES[i];
      const milestoneNumber = await allocateMilestoneNumber({
        projectId: project.id,
        projectSlug: project.slug,
      });
      const rupees = (stage.amount / 100).toLocaleString("en-IN");
      const milestone = await prisma.milestone.create({
        data: {
          projectId: project.id,
          milestoneNumber,
          title: stage.title,
          description: `${stage.pct}% of contract · ₹${rupees}. Payment upon reaching this construction milestone.`,
          status: i === 0 ? "IN_PROGRESS" : "UPCOMING",
          targetDate: new Date(
            Date.now() + (i + 1) * 45 * 24 * 60 * 60 * 1000,
          ),
          visibility: "PROJECT_SHARED",
          allowedUserIds: [],
          createdById: kevin.id,
          sortOrder: i,
        },
      });
      createdMilestones.push(milestone);
    }

    const basement = createdMilestones[0];

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
        milestoneId: basement.id,
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
        title: "Schedule basement concrete pour",
        description: "Coordinate cement, labour, and curing plan",
        status: "IN_PROGRESS",
        priority: "URGENT",
        milestoneId: basement.id,
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
        milestoneId: basement.id,
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
