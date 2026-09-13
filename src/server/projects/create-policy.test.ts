import { describe, expect, it } from "vitest";

import { canCreateProjectFromRoles } from "@/server/projects/create-policy";

describe("project creation policy", () => {
  it("allows bootstrap when the user has no memberships", () => {
    expect(canCreateProjectFromRoles([])).toBe(true);
  });

  it("allows users who already own at least one project", () => {
    expect(canCreateProjectFromRoles(["OWNER"])).toBe(true);
    expect(canCreateProjectFromRoles(["ENGINEER", "OWNER"])).toBe(true);
  });

  it("blocks engineers and other non-owners from creating another project", () => {
    expect(canCreateProjectFromRoles(["ENGINEER"])).toBe(false);
    expect(canCreateProjectFromRoles(["VIEWER"])).toBe(false);
    expect(canCreateProjectFromRoles(["ADMIN"])).toBe(false);
    expect(canCreateProjectFromRoles(["ENGINEER", "ACCOUNTANT"])).toBe(false);
  });
});
