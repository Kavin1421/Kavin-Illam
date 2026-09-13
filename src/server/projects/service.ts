import type { ProjectStatus, ProjectType } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { paiseFromRupeeString } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { requireAuthenticatedUser } from "@/server/auth/session";
import {
  requireProjectMemberBySlug,
  requireProjectPermission,
  requireProjectPermissionBySlug,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { ensureDefaultFinancialAccounts } from "@/server/finance/accounts";
import { ensureSystemCategories } from "@/server/finance/categories";
import { canCreateProjectFromRoles } from "@/server/projects/create-policy";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/validators/projects";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "project";
  let candidate = root;
  let i = 2;
  while (await prisma.project.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${i}`;
    i += 1;
    if (i > 100) {
      throw new AppError(
        "CONFLICT",
        "Unable to allocate a unique project slug.",
      );
    }
  }
  return candidate;
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("VALIDATION", "Invalid date value.");
  }
  return date;
}

function parseOptionalBudget(value?: string) {
  if (!value?.trim()) return null;
  try {
    return paiseFromRupeeString(value);
  } catch {
    throw new AppError("VALIDATION", "Invalid budget amount.");
  }
}

const projectListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  projectType: true,
  status: true,
  currency: true,
  estimatedBudget: true,
  updatedAt: true,
  ownerId: true,
} as const;

export async function listMyProjects() {
  const user = await requireAuthenticatedUser();
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: {
      role: true,
      project: { select: projectListSelect },
    },
    orderBy: { updatedAt: "desc" },
  });

  return memberships
    .filter((m) => m.project.status !== "ARCHIVED")
    .map((m) => ({
      ...m.project,
      role: m.role,
    }));
}

/**
 * Only project owners may create additional projects.
 * Bootstrap exception: a user with zero memberships may create their first project.
 * Engineers and other non-owner roles cannot add another project.
 */
export async function userCanCreateProject(userId: string): Promise<boolean> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { role: true },
  });

  return canCreateProjectFromRoles(memberships.map((m) => m.role));
}

export async function requireCanCreateProject() {
  const user = await requireAuthenticatedUser();
  const allowed = await userCanCreateProject(user.id);
  if (!allowed) {
    throw new AppError(
      "FORBIDDEN",
      "Only project owners can create new projects. Ask an owner if you need another workspace.",
    );
  }
  return user;
}

export async function getProjectForMember(slug: string) {
  const ctx = await requireProjectMemberBySlug(slug);
  return {
    project: ctx.project,
    role: ctx.role,
    membershipId: ctx.membership.id,
  };
}

export async function createProject(input: unknown) {
  const user = await requireCanCreateProject();
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the project details.");
  }

  const slug = await uniqueSlug(parsed.data.name);
  const estimatedBudget = parseOptionalBudget(
    parsed.data.estimatedBudgetRupees,
  );

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      projectType: parsed.data.projectType as ProjectType,
      address: parsed.data.address || null,
      currency: (parsed.data.currency || "INR").toUpperCase(),
      estimatedBudget,
      startDate: parseOptionalDate(parsed.data.startDate),
      expectedCompletionDate: parseOptionalDate(
        parsed.data.expectedCompletionDate,
      ),
      ownerId: user.id,
      status: "ACTIVE",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
          invitedById: user.id,
        },
      },
      counters: {
        create: [
          { key: "EXP", value: 0 },
          { key: "DOC", value: 0 },
          { key: "REQ", value: 0 },
          { key: "ADV", value: 0 },
        ],
      },
    },
  });

  await ensureSystemCategories();
  await ensureDefaultFinancialAccounts({
    projectId: project.id,
    ownerId: user.id,
    currency: project.currency,
  });

  logger.info("Project created", { projectId: project.id, ownerId: user.id });
  return project;
}

export async function updateProject(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "PROJECT_EDIT");
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the project details.");
  }

  const data: {
    name?: string;
    description?: string | null;
    projectType?: ProjectType;
    address?: string | null;
    currency?: string;
    estimatedBudget?: number | null;
    startDate?: Date | null;
    expectedCompletionDate?: Date | null;
    status?: ProjectStatus;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    data.description = parsed.data.description || null;
  }
  if (parsed.data.projectType !== undefined) {
    data.projectType = parsed.data.projectType;
  }
  if (parsed.data.address !== undefined) {
    data.address = parsed.data.address || null;
  }
  if (parsed.data.currency !== undefined) {
    data.currency = parsed.data.currency.toUpperCase();
  }
  if (parsed.data.estimatedBudgetRupees !== undefined) {
    data.estimatedBudget = parseOptionalBudget(
      parsed.data.estimatedBudgetRupees,
    );
  }
  if (parsed.data.startDate !== undefined) {
    data.startDate = parseOptionalDate(parsed.data.startDate);
  }
  if (parsed.data.expectedCompletionDate !== undefined) {
    data.expectedCompletionDate = parseOptionalDate(
      parsed.data.expectedCompletionDate,
    );
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }

  const project = await prisma.project.update({
    where: { id: ctx.project.id },
    data,
  });

  logger.info("Project updated", {
    projectId: project.id,
    actorId: ctx.user.id,
  });
  return project;
}

export async function archiveProject(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "PROJECT_EDIT");
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    throw new AppError(
      "FORBIDDEN",
      "Only owners or admins can archive projects.",
    );
  }

  const project = await prisma.project.update({
    where: { id: ctx.project.id },
    data: { status: "ARCHIVED" },
  });

  logger.info("Project archived", {
    projectId: project.id,
    actorId: ctx.user.id,
  });
  return project;
}

export async function assertCanInvite(projectId: string) {
  return requireProjectPermission(projectId, "MEMBER_INVITE");
}
