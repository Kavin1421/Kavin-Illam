import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";

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
        estimatedBudget: 500_000_000, // ₹50,00,000 in paise
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

  console.log("Seeded users + project:");
  console.log(`- ${kevin.name} <${kevin.email}> OWNER`);
  console.log(`- ${engineer.name} <${engineer.email}> ENGINEER`);
  console.log(`- Project: ${project.name} (/p/${project.slug})`);
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
