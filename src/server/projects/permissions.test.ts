import { describe, expect, it } from "vitest";

import { projectCodeFromSlug, slugify } from "@/lib/slug";
import {
  roleHasPermission,
} from "@/server/authorization/permissions";

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Kavin Illam")).toBe("kavin-illam");
    expect(slugify("  Future House!! ")).toBe("future-house");
  });

  it("derives a short project code", () => {
    expect(projectCodeFromSlug("kavin-illam")).toBe("KIX");
  });
});

describe("role permissions", () => {
  it("gives owners full access", () => {
    expect(roleHasPermission("OWNER", "MEMBER_INVITE")).toBe(true);
    expect(roleHasPermission("OWNER", "FINANCE_DELETE")).toBe(true);
  });

  it("restricts engineers from member admin", () => {
    expect(roleHasPermission("ENGINEER", "MEMBER_INVITE")).toBe(false);
    expect(roleHasPermission("ENGINEER", "PAYMENT_REQUEST_CREATE")).toBe(true);
  });

  it("keeps viewer read-only for edits", () => {
    expect(roleHasPermission("VIEWER", "PROJECT_EDIT")).toBe(false);
    expect(roleHasPermission("VIEWER", "MEMBER_INVITE")).toBe(false);
    expect(roleHasPermission("VIEWER", "PROJECT_VIEW")).toBe(true);
  });
});
