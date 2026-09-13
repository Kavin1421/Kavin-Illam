import {
  engineerAllowedSamplePermissions,
  engineerForbiddenPermissions,
  roleHasPermission,
} from "@/server/authorization/permissions";
import { describe, expect, it } from "vitest";

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
