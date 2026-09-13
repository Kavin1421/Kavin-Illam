import { describe, expect, it } from "vitest";

import {
  notDeleted,
  rewriteSoftDeleteArgs,
  rewriteWhereSoftDelete,
} from "./soft-delete";

describe("notDeleted", () => {
  it("matches both unset and explicit-null deletedAt (Prisma MongoDB)", () => {
    expect(notDeleted).toEqual({
      OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
    });
  });
});

describe("rewriteWhereSoftDelete", () => {
  it("expands bare deletedAt: null beside other filters", () => {
    expect(
      rewriteWhereSoftDelete({ projectId: "p1", deletedAt: null }),
    ).toEqual({
      AND: [notDeleted, { projectId: "p1" }],
    });
  });

  it("expands deletedAt: { equals: null }", () => {
    expect(
      rewriteWhereSoftDelete({
        projectId: "p1",
        deletedAt: { equals: null },
      }),
    ).toEqual({
      AND: [notDeleted, { projectId: "p1" }],
    });
  });

  it("expands a lone deletedAt: null object", () => {
    expect(rewriteWhereSoftDelete({ deletedAt: null })).toEqual(notDeleted);
  });

  it("does not double-expand an already expanded notDeleted clause", () => {
    expect(rewriteWhereSoftDelete(notDeleted)).toEqual(notDeleted);
  });

  it("leaves soft-deleted Date filters alone", () => {
    const when = new Date("2026-01-01T00:00:00.000Z");
    expect(
      rewriteWhereSoftDelete({ projectId: "p1", deletedAt: { gte: when } }),
    ).toEqual({ projectId: "p1", deletedAt: { gte: when } });
  });

  it("rewrites nested OR / AND branches", () => {
    expect(
      rewriteWhereSoftDelete({
        OR: [
          { projectId: "a", deletedAt: null },
          { projectId: "b", deletedAt: null },
        ],
      }),
    ).toEqual({
      OR: [
        { AND: [notDeleted, { projectId: "a" }] },
        { AND: [notDeleted, { projectId: "b" }] },
      ],
    });
  });

  it("preserves spread notDeleted + other fields without nesting forever", () => {
    expect(
      rewriteWhereSoftDelete({ projectId: "p1", ...notDeleted }),
    ).toEqual({
      projectId: "p1",
      ...notDeleted,
    });
  });
});

describe("rewriteSoftDeleteArgs", () => {
  it("rewrites top-level where and nested include where", () => {
    expect(
      rewriteSoftDeleteArgs({
        where: { projectId: "p1", deletedAt: null },
        include: {
          settlements: {
            where: { deletedAt: null },
            select: { kind: true },
          },
        },
      }),
    ).toEqual({
      where: { AND: [notDeleted, { projectId: "p1" }] },
      include: {
        settlements: {
          where: notDeleted,
          select: { kind: true },
        },
      },
    });
  });

  it("does not rewrite write payloads (data.deletedAt null stays)", () => {
    expect(
      rewriteSoftDeleteArgs({
        where: { id: "x" },
        data: { deletedAt: null, status: "OPEN" },
      }),
    ).toEqual({
      where: { id: "x" },
      data: { deletedAt: null, status: "OPEN" },
    });
  });
});
