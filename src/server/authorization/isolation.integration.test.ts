/**
 * Integration tests against MongoDB.
 * Requires DATABASE_URL (or MONGO_URL). Skips when absent.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(
  process.env.DATABASE_URL?.trim() || process.env.MONGO_URL?.trim(),
);

describe.skipIf(!hasDb)("project isolation (integration)", () => {
  const suffix = `${Date.now()}`;
  let kevinId = "";
  let engineerId = "";
  let outsiderId = "";
  let projectAId = "";
  let projectBId = "";

  let prisma: typeof import("@/server/db/prisma").prisma;
  let assertProjectMembership: typeof import("@/server/authorization/access").assertProjectMembership;
  let assertProjectPermission: typeof import("@/server/authorization/access").assertProjectPermission;
  let assertCanViewProjectResource: typeof import("@/server/authorization/access").assertCanViewProjectResource;
  let AppError: typeof import("@/lib/errors").AppError;

  beforeAll(async () => {
    ({ prisma } = await import("@/server/db/prisma"));
    ({
      assertProjectMembership,
      assertProjectPermission,
      assertCanViewProjectResource,
    } = await import("@/server/authorization/access"));
    ({ AppError } = await import("@/lib/errors"));

    const kevin = await prisma.user.create({
      data: {
        email: `kevin.iso.${suffix}@test.local`,
        name: "Kevin Iso",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });
    const engineer = await prisma.user.create({
      data: {
        email: `engineer.iso.${suffix}@test.local`,
        name: "Engineer Iso",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });
    const outsider = await prisma.user.create({
      data: {
        email: `outsider.iso.${suffix}@test.local`,
        name: "Outsider",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });

    kevinId = kevin.id;
    engineerId = engineer.id;
    outsiderId = outsider.id;

    const projectA = await prisma.project.create({
      data: {
        name: `Iso Project A ${suffix}`,
        slug: `iso-a-${suffix}`,
        ownerId: kevinId,
        status: "ACTIVE",
        currency: "INR",
        projectType: "RESIDENTIAL",
        members: {
          create: [
            { userId: kevinId, role: "OWNER", status: "ACTIVE" },
            { userId: engineerId, role: "ENGINEER", status: "ACTIVE" },
          ],
        },
      },
    });

    const projectB = await prisma.project.create({
      data: {
        name: `Iso Project B ${suffix}`,
        slug: `iso-b-${suffix}`,
        ownerId: kevinId,
        status: "ACTIVE",
        currency: "INR",
        projectType: "RESIDENTIAL",
        members: {
          create: [{ userId: kevinId, role: "OWNER", status: "ACTIVE" }],
        },
      },
    });

    projectAId = projectA.id;
    projectBId = projectB.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: [projectAId, projectBId].filter(Boolean) } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectAId, projectBId].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [kevinId, engineerId, outsiderId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it("User A (engineer) cannot access Project B by id", async () => {
    await expect(
      assertProjectMembership(projectBId, engineerId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("outsider cannot access Project A by guessing id", async () => {
    await expect(
      assertProjectMembership(projectAId, outsiderId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("engineer can access Project A where they are a member", async () => {
    const access = await assertProjectMembership(projectAId, engineerId);
    expect(access.role).toBe("ENGINEER");
    expect(access.project.id).toBe(projectAId);
  });

  it("engineer cannot invite members (permission denied)", async () => {
    await expect(
      assertProjectPermission(projectAId, engineerId, "MEMBER_INVITE"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("engineer cannot delete finance history", async () => {
    await expect(
      assertProjectPermission(projectAId, engineerId, "FINANCE_DELETE"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("owner can invite members on Project A", async () => {
    const access = await assertProjectPermission(
      projectAId,
      kevinId,
      "MEMBER_INVITE",
    );
    expect(access.role).toBe("OWNER");
  });

  it("engineer cannot view Kevin private resource via API-style assert", async () => {
    await expect(
      assertCanViewProjectResource(projectAId, engineerId, {
        projectId: projectAId,
        visibility: "PRIVATE",
        createdById: kevinId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("engineer can view shared resource in their project", async () => {
    const access = await assertCanViewProjectResource(projectAId, engineerId, {
      projectId: projectAId,
      visibility: "PROJECT_SHARED",
      createdById: kevinId,
    });
    expect(access.userId).toBe(engineerId);
  });

  it("cross-project resource id does not grant access", async () => {
    await expect(
      assertCanViewProjectResource(projectAId, engineerId, {
        projectId: projectBId,
        visibility: "PROJECT_SHARED",
        createdById: kevinId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("uses AppError for isolation failures", async () => {
    try {
      await assertProjectMembership(projectBId, engineerId);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
    }
  });
});
