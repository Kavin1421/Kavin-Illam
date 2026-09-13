import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  passwordResetTemplate,
  projectInvitationTemplate,
  verifyEmailTemplate,
} from "@/server/email/templates";

describe("email templates", () => {
  it("escapes untrusted content", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("renders a branded verify email", () => {
    const mail = verifyEmailTemplate({
      verifyUrl: "https://example.com/verify",
      name: "Kevin",
    });
    expect(mail.subject).toContain("Verify");
    expect(mail.html).toContain("Comic Neue");
    expect(mail.html).toContain("Verify email");
    expect(mail.html).toContain("https://example.com/verify");
    expect(mail.html).toContain("#00D084");
    expect(mail.text).toContain("https://example.com/verify");
  });

  it("renders an elegant project invitation", () => {
    const mail = projectInvitationTemplate({
      inviteUrl: "https://example.com/invite/token",
      projectName: "Kavin Illam",
      role: "ENGINEER",
      inviterName: "Kevin",
    });
    expect(mail.subject).toContain("Kavin Illam");
    expect(mail.html).toContain("Accept invitation");
    expect(mail.html).toContain("engineer");
    expect(mail.html).toContain("Kevin");
    expect(mail.html).not.toContain("<script>");
  });

  it("renders password reset with expiry note", () => {
    const mail = passwordResetTemplate({
      resetUrl: "https://example.com/reset",
    });
    expect(mail.html).toContain("Reset password");
    expect(mail.html).toContain("1 hour");
  });
});
