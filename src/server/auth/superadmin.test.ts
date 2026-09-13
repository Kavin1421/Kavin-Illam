import { describe, expect, it } from "vitest";

import {
  getSuperadminEmails,
  isSuperadminEmail,
  resolveIsSuperadmin,
} from "./superadmin";

describe("superadmin", () => {
  it("treats the platform owner email as superadmin by default", () => {
    expect(isSuperadminEmail("kkavinkumar24@gmail.com")).toBe(true);
    expect(isSuperadminEmail("KKavinkumar24@Gmail.com")).toBe(true);
  });

  it("rejects ordinary users", () => {
    expect(isSuperadminEmail("engineer@example.com")).toBe(false);
    expect(isSuperadminEmail(null)).toBe(false);
    expect(isSuperadminEmail("")).toBe(false);
  });

  it("always includes the default owner in the email list", () => {
    expect(getSuperadminEmails()).toContain("kkavinkumar24@gmail.com");
  });

  it("exports resolveIsSuperadmin for session+db checks", () => {
    expect(typeof resolveIsSuperadmin).toBe("function");
  });
});
