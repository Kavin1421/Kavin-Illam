import { describe, expect, it } from "vitest";

import { canCreateProjectAsSuperadmin } from "@/server/projects/create-policy";

describe("canCreateProjectAsSuperadmin", () => {
  it("allows only platform superadmins", () => {
    expect(canCreateProjectAsSuperadmin(true)).toBe(true);
    expect(canCreateProjectAsSuperadmin(false)).toBe(false);
  });
});
