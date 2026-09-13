import { describe, expect, it } from "vitest";

import { sanitizeAuditMetadata } from "@/server/audit/record";

describe("sanitizeAuditMetadata", () => {
  it("redacts sensitive keys at any depth", () => {
    const cleaned = sanitizeAuditMetadata({
      amount: 100,
      password: "hunter2",
      nested: {
        api_key: "abc",
        token: "xyz",
        ok: true,
      },
      Authorization: "Bearer secret",
    }) as Record<string, unknown>;

    expect(cleaned.amount).toBe(100);
    expect(cleaned.password).toBe("[redacted]");
    expect(cleaned.Authorization).toBe("[redacted]");
    const nested = cleaned.nested as Record<string, unknown>;
    expect(nested.api_key).toBe("[redacted]");
    expect(nested.token).toBe("[redacted]");
    expect(nested.ok).toBe(true);
  });

  it("truncates very long strings", () => {
    const long = "a".repeat(2500);
    const cleaned = sanitizeAuditMetadata({ note: long }) as {
      note: string;
    };
    expect(cleaned.note.endsWith("…")).toBe(true);
    expect(cleaned.note.length).toBeLessThan(2100);
  });
});
