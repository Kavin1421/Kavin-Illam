import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { roleHasPermission } from "@/server/authorization/permissions";

/**
 * Phase 13 hardening checks — complements isolation.integration.test.ts.
 * ID enumeration policy: non-members and unauthorized roles get NOT_FOUND
 * (or notFound()) rather than leaking resource existence via FORBIDDEN where
 * the product already maps that way for audit pages.
 */
describe("security hardening baselines", () => {
  it("engineers cannot view audit logs by permission", () => {
    expect(roleHasPermission("ENGINEER", "AUDIT_VIEW")).toBe(false);
    expect(roleHasPermission("OWNER", "AUDIT_VIEW")).toBe(true);
    expect(roleHasPermission("ADMIN", "AUDIT_VIEW")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "AUDIT_VIEW")).toBe(true);
  });

  it("AppError NOT_FOUND is used for anti-enumeration messaging", () => {
    const missing = new AppError("NOT_FOUND", "Transaction was not found.");
    expect(missing.status).toBe(404);
    expect(missing.message).not.toMatch(/permission/i);
  });

  it("rate-limit errors use 429", () => {
    const limited = new AppError("RATE_LIMITED");
    expect(limited.status).toBe(429);
  });
});
