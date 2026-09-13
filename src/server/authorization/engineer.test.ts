import { describe, expect, it } from "vitest";

import {
  engineerAllowedSamplePermissions,
  engineerForbiddenPermissions,
  roleHasPermission,
} from "@/server/authorization/permissions";
import { canCreateProjectFromRoles } from "@/server/projects/create-policy";

describe("engineer restriction matrix", () => {
  it("denies administrative and destructive finance permissions", () => {
    for (const permission of engineerForbiddenPermissions()) {
      expect(roleHasPermission("ENGINEER", permission)).toBe(false);
    }
  });

  it("allows the expected day-to-day collaborator permissions", () => {
    for (const permission of engineerAllowedSamplePermissions()) {
      expect(roleHasPermission("ENGINEER", permission)).toBe(true);
    }
  });

  it("prevents engineers from inviting or removing members", () => {
    expect(roleHasPermission("ENGINEER", "MEMBER_INVITE")).toBe(false);
    expect(roleHasPermission("ENGINEER", "MEMBER_REMOVE")).toBe(false);
    expect(roleHasPermission("OWNER", "MEMBER_INVITE")).toBe(true);
  });
});

describe("engineer cannot create another project", () => {
  it("denies project creation for engineer-only memberships", () => {
    expect(canCreateProjectFromRoles(["ENGINEER"])).toBe(false);
  });

  it("allows owners to create additional projects", () => {
    expect(canCreateProjectFromRoles(["OWNER"])).toBe(true);
  });
});
