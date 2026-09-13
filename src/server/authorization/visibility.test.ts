import { describe, expect, it } from "vitest";

import {
  canEditResource,
  canViewResource,
  filterVisibleResources,
  includeInSharedProjectTotals,
  type VisibleResource,
} from "@/server/authorization/visibility";

const projectId = "proj_1";

function resource(
  overrides: Partial<VisibleResource> &
    Pick<VisibleResource, "visibility" | "createdById">,
): VisibleResource {
  return {
    projectId,
    allowedUserIds: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("visibility — private resources", () => {
  const privateExpense = resource({
    visibility: "PRIVATE",
    createdById: "kevin",
  });

  it("allows the creator to view private resources", () => {
    expect(
      canViewResource(
        { userId: "kevin", role: "OWNER" },
        privateExpense,
        projectId,
      ),
    ).toBe(true);
  });

  it("allows the project OWNER to oversee private resources", () => {
    expect(
      canViewResource(
        { userId: "other-owner", role: "OWNER" },
        privateExpense,
        projectId,
      ),
    ).toBe(true);
  });

  it("blocks engineers from viewing private resources", () => {
    expect(
      canViewResource(
        { userId: "engineer", role: "ENGINEER" },
        privateExpense,
        projectId,
      ),
    ).toBe(false);
  });

  it("blocks admins who are not the creator from viewing private resources", () => {
    expect(
      canViewResource(
        { userId: "admin", role: "ADMIN" },
        privateExpense,
        projectId,
      ),
    ).toBe(false);
  });

  it("never includes private rows in shared project totals", () => {
    expect(includeInSharedProjectTotals(privateExpense)).toBe(false);
  });

  it("does not allow non-creators to edit private resources", () => {
    expect(
      canEditResource(
        { userId: "other-owner", role: "OWNER" },
        privateExpense,
        projectId,
      ),
    ).toBe(false);
  });
});

describe("visibility — project shared", () => {
  const shared = resource({
    visibility: "PROJECT_SHARED",
    createdById: "kevin",
  });

  it("allows engineer members to view shared resources", () => {
    expect(
      canViewResource(
        { userId: "engineer", role: "ENGINEER" },
        shared,
        projectId,
      ),
    ).toBe(true);
  });

  it("includes shared rows in shared totals", () => {
    expect(includeInSharedProjectTotals(shared)).toBe(true);
  });
});

describe("visibility — restricted", () => {
  const restricted = resource({
    visibility: "RESTRICTED",
    createdById: "kevin",
    allowedUserIds: ["accountant"],
  });

  it("allows explicitly listed users", () => {
    expect(
      canViewResource(
        { userId: "accountant", role: "ACCOUNTANT" },
        restricted,
        projectId,
      ),
    ).toBe(true);
  });

  it("blocks engineers not on the ACL", () => {
    expect(
      canViewResource(
        { userId: "engineer", role: "ENGINEER" },
        restricted,
        projectId,
      ),
    ).toBe(false);
  });

  it("excludes restricted rows from shared totals", () => {
    expect(includeInSharedProjectTotals(restricted)).toBe(false);
  });
});

describe("visibility — cross-project and soft-delete", () => {
  it("rejects resources from another project even if shared", () => {
    const foreign = resource({
      visibility: "PROJECT_SHARED",
      createdById: "kevin",
      projectId: "other_project",
    });
    expect(
      canViewResource(
        { userId: "engineer", role: "ENGINEER" },
        foreign,
        projectId,
      ),
    ).toBe(false);
  });

  it("hides soft-deleted resources from engineers", () => {
    const deleted = resource({
      visibility: "PROJECT_SHARED",
      createdById: "kevin",
      deletedAt: new Date(),
    });
    expect(
      canViewResource(
        { userId: "engineer", role: "ENGINEER" },
        deleted,
        projectId,
      ),
    ).toBe(false);
    expect(
      canViewResource({ userId: "kevin", role: "OWNER" }, deleted, projectId),
    ).toBe(true);
  });

  it("filters collections to the authorized dataset", () => {
    const rows = [
      resource({ visibility: "PRIVATE", createdById: "kevin" }),
      resource({ visibility: "PROJECT_SHARED", createdById: "kevin" }),
      resource({
        visibility: "RESTRICTED",
        createdById: "kevin",
        allowedUserIds: ["engineer"],
      }),
    ];

    const engineerView = filterVisibleResources(
      { userId: "engineer", role: "ENGINEER" },
      rows,
      projectId,
    );

    expect(engineerView).toHaveLength(2);
    expect(engineerView.map((r) => r.visibility).sort()).toEqual([
      "PROJECT_SHARED",
      "RESTRICTED",
    ]);
  });
});
