import { z } from "zod";

import { AppError } from "@/lib/errors";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { SYSTEM_CATEGORY_SEEDS } from "@/server/finance/default-seeds";

export { SYSTEM_CATEGORY_SEEDS } from "@/server/finance/default-seeds";

export async function ensureSystemCategories() {
  for (const seed of SYSTEM_CATEGORY_SEEDS) {
    const existing = await prisma.category.findFirst({
      where: { code: seed.code, isSystem: true, projectId: null },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          code: seed.code,
          name: seed.name,
          isSystem: true,
          isActive: true,
          projectId: null,
        },
      });
    }
  }
}

export async function listCategoriesForProject(slug: string) {
  await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");
  // Heal after DB wipes / fresh environments so finance forms never see an empty list.
  await ensureSystemCategories();
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }

  return prisma.category.findMany({
    where: {
      isActive: true,
      OR: [{ isSystem: true, projectId: null }, { projectId: project.id }],
    },
    orderBy: [{ name: "asc" }],
  });
}

const customCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores"),
});

export async function createProjectCategory(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "PROJECT_EDIT");
  const parsed = customCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid category details.");
  }

  return prisma.category.create({
    data: {
      projectId: ctx.project.id,
      name: parsed.data.name,
      code: parsed.data.code.toUpperCase(),
      isSystem: false,
      isActive: true,
    },
  });
}
