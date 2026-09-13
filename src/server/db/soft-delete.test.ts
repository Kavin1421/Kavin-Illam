import { describe, expect, it } from "vitest";

import { notDeleted } from "./soft-delete";

describe("notDeleted", () => {
  it("matches both unset and explicit-null deletedAt (Prisma MongoDB)", () => {
    expect(notDeleted).toEqual({
      OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
    });
  });
});
