import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";

/**
 * Development seed only — never run automatically in production.
 *
 * Usage:
 *   SEED_PASSWORD='...' pnpm db:seed
 */
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
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
    select: { id: true, email: true, name: true },
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
    select: { id: true, email: true, name: true },
  });

  console.log("Seeded users:");
  console.log(`- ${kevin.name} <${kevin.email}>`);
  console.log(`- ${engineer.name} <${engineer.email}>`);
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
