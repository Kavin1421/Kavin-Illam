import { describe, expect, it } from "vitest";

import { canViewResource } from "@/server/authorization/visibility";

describe("advance visibility", () => {
  const projectId = "proj1";

  it("lets engineer view shared advances but not private ones", () => {
    const engineer = { userId: "eng1", role: "ENGINEER" as const };

    expect(
      canViewResource(
        engineer,
        {
          projectId,
          visibility: "PROJECT_SHARED",
          createdById: "owner1",
        },
        projectId,
      ),
    ).toBe(true);

    expect(
      canViewResource(
        engineer,
        {
          projectId,
          visibility: "PRIVATE",
          createdById: "owner1",
        },
        projectId,
      ),
    ).toBe(false);
  });

  it("lets owner view private advances they created", () => {
    expect(
      canViewResource(
        { userId: "owner1", role: "OWNER" },
        {
          projectId,
          visibility: "PRIVATE",
          createdById: "owner1",
        },
        projectId,
      ),
    ).toBe(true);
  });
});
