import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/validators/auth";
import { generateOpaqueToken, hashToken } from "@/server/auth/password";
import { assertRateLimit, rateLimitKey } from "@/server/auth/rate-limit";

describe("auth validators", () => {
  it("accepts a valid registration payload", () => {
    const parsed = registerSchema.safeParse({
      name: "Kevin",
      email: "kevin@example.com",
      phone: "",
      password: "SecurePass1",
      confirmPassword: "SecurePass1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const parsed = registerSchema.safeParse({
      name: "Kevin",
      email: "kevin@example.com",
      password: "SecurePass1",
      confirmPassword: "SecurePass2",
    });
    expect(parsed.success).toBe(false);
  });

  it("validates login and reset schemas", () => {
    expect(
      loginSchema.safeParse({
        email: "a@b.com",
        password: "12345678",
      }).success,
    ).toBe(true);

    expect(
      resetPasswordSchema.safeParse({
        token: "x".repeat(24),
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(true);

    expect(
      acceptInvitationSchema.safeParse({
        token: "y".repeat(24),
        name: "Engineer",
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(true);
  });
});

describe("token hashing", () => {
  it("hashes tokens stably without exposing raw values", () => {
    const raw = generateOpaqueToken();
    expect(hashToken(raw)).toHaveLength(64);
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
  });
});

describe("rate limit", () => {
  it("blocks after the configured number of attempts", () => {
    const key = rateLimitKey("test", `case-${Date.now()}`);
    expect(assertRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(assertRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(assertRateLimit(key, 2, 60_000).ok).toBe(false);
  });
});
