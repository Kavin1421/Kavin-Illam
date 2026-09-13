import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";
import { ensureSystemCategories } from "../src/server/finance/categories";
import { allocateTransactionNumber } from "../src/server/finance/numbering";

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

  if (existingTxCount === 0 && engineering && cement && steel && labour && personal && hdfc) {
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

  console.log("Seeded users + project + finance:");
  console.log(`- ${kevin.name} <${kevin.email}> OWNER`);
  console.log(`- ${engineer.name} <${engineer.email}> ENGINEER`);
  console.log(`- Project: ${project.name} (/p/${project.slug}/finance)`);
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
