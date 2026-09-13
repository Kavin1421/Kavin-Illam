import { describe, expect, it } from "vitest";

import {
  engineerAllowedSamplePermissions,
  engineerForbiddenPermissions,
  roleHasPermission,
} from "@/server/authorization/permissions";
import { canCreateProjectAsSuperadmin } from "@/server/projects/create-policy";
import { isSuperadminEmail } from "@/server/auth/superadmin";

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

describe("project creation is superadmin-only", () => {
  it("denies project creation for non-superadmins", () => {
    expect(canCreateProjectAsSuperadmin(false)).toBe(false);
    expect(isSuperadminEmail("engineer@example.com")).toBe(false);
  });

  it("allows the platform superadmin email", () => {
    expect(isSuperadminEmail("kkavinkumar24@gmail.com")).toBe(true);
    expect(canCreateProjectAsSuperadmin(true)).toBe(true);
  });
});
