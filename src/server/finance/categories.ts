import { z } from "zod";

import { AppError } from "@/lib/errors";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { prisma } from "@/server/db/prisma";

export const SYSTEM_CATEGORY_SEEDS = [
  { code: "LAND", name: "Land" },
  { code: "ARCHITECTURE", name: "Architecture" },
  { code: "ENGINEERING", name: "Engineering" },
  { code: "CIVIL_WORK", name: "Civil work" },
  { code: "MATERIALS", name: "Materials" },
  { code: "CEMENT", name: "Cement" },
  { code: "STEEL", name: "Steel" },
  { code: "BRICKS", name: "Bricks" },
  { code: "SAND", name: "Sand" },
  { code: "AGGREGATE", name: "Aggregate" },
  { code: "PLUMBING", name: "Plumbing" },
  { code: "ELECTRICAL", name: "Electrical" },
  { code: "CARPENTRY", name: "Carpentry" },
  { code: "PAINTING", name: "Painting" },
  { code: "FLOORING", name: "Flooring" },
  { code: "TILES", name: "Tiles" },
  { code: "DOORS", name: "Doors" },
  { code: "WINDOWS", name: "Windows" },
  { code: "KITCHEN", name: "Kitchen" },
  { code: "BATHROOM", name: "Bathroom" },
  { code: "INTERIOR", name: "Interior" },
  { code: "LABOUR", name: "Labour" },
  { code: "TRANSPORT", name: "Transport" },
  { code: "EQUIPMENT", name: "Equipment" },
  { code: "GOVERNMENT_FEES", name: "Government fees" },
  { code: "LEGAL", name: "Legal" },
  { code: "DOCUMENTATION", name: "Documentation" },
  { code: "UTILITY", name: "Utility" },
  { code: "MISCELLANEOUS", name: "Miscellaneous" },
  { code: "PERSONAL", name: "Personal" },
] as const;

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
