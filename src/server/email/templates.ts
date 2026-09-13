/**
 * Elegant, minimal transactional email templates for Kavin Illam.
 * Inline CSS + table layout for broad client support.
 * Comic Neue is requested via Google Fonts; clients that block webfonts fall back cleanly.
 */

const BRAND = {
  bg: "#042F2C",
  surface: "#063F3A",
  card: "#0A4A44",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#B8D6D1",
  cta: "#00D084",
  ctaText: "#032F2C",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td align="center" bgcolor="${BRAND.cta}" style="border-radius:10px;background-color:${BRAND.cta};">
          <a href="${safeHref}"
             style="display:inline-block;padding:14px 28px;font-family:'Comic Neue',Georgia,serif;font-size:15px;font-weight:700;line-height:1;color:${BRAND.ctaText};text-decoration:none;border-radius:10px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>`;
}

function layout(params: {
  preheader: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  const preheader = escapeHtml(params.preheader);
  const title = escapeHtml(params.title);
  const footer =
    params.footerNote ??
    "Kavin Illam · Build · Track · Manage";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet" />
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="left" style="padding:0 4px 20px;">
              <p style="margin:0;font-family:'Comic Neue',Georgia,serif;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.cta};font-weight:700;">
                Kavin Illam
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:18px;padding:36px 32px;">
              <h1 style="margin:0 0 14px;font-family:'Comic Neue',Georgia,serif;font-size:28px;line-height:1.2;font-weight:700;color:${BRAND.text};letter-spacing:-0.02em;">
                ${title}
              </h1>
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;">
              <p style="margin:0;font-family:'Comic Neue',Georgia,serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                ${escapeHtml(footer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-family:'Comic Neue',Georgia,serif;font-size:16px;line-height:1.55;color:${BRAND.muted};">${text}</p>`;
}

function mutedNote(text: string): string {
  return `<p style="margin:20px 0 0;font-family:'Comic Neue',Georgia,serif;font-size:13px;line-height:1.5;color:${BRAND.muted};opacity:0.85;">${text}</p>`;
}

export function verifyEmailTemplate(params: {
  verifyUrl: string;
  name?: string | null;
}): { subject: string; text: string; html: string } {
  const greeting = params.name?.trim()
    ? `Welcome, ${escapeHtml(params.name.trim())}.`
    : "Welcome to Kavin Illam.";

  const subject = "Verify your Kavin Illam email";
  const text = `${greeting.replace(/<[^>]+>/g, "")}\n\nVerify your email:\n${params.verifyUrl}\n\nIf you did not create this account, you can ignore this message.\n\n— Kavin Illam`;

  const html = layout({
    preheader: "Confirm your email to continue building with Kavin Illam.",
    title: "Verify your email",
    bodyHtml: [
      paragraph(greeting),
      paragraph(
        "One quick step — confirm your email so we can keep your projects secure.",
      ),
      ctaButton(params.verifyUrl, "Verify email"),
      mutedNote(
        "If the button does not work, paste this link into your browser:<br /><span style=\"word-break:break-all;color:#5EEAD4;\">" +
          escapeHtml(params.verifyUrl) +
          "</span>",
      ),
      mutedNote("If you did not create this account, ignore this message."),
    ].join(""),
  });

  return { subject, text, html };
}

export function projectInvitationTemplate(params: {
  inviteUrl: string;
  projectName: string;
  role: string;
  inviterName?: string | null;
}): { subject: string; text: string; html: string } {
  const project = escapeHtml(params.projectName);
  const role = escapeHtml(params.role.replaceAll("_", " ").toLowerCase());
  const inviter = params.inviterName?.trim()
    ? escapeHtml(params.inviterName.trim())
    : "A collaborator";

  const subject = `You're invited to ${params.projectName}`;
  const text = `${params.inviterName?.trim() || "A collaborator"} invited you to ${params.projectName} as ${params.role.replaceAll("_", " ")}.\n\nAccept invitation:\n${params.inviteUrl}\n\nThis invite expires in 7 days.\n\n— Kavin Illam`;

  const html = layout({
    preheader: `Join ${params.projectName} on Kavin Illam.`,
    title: "You're invited",
    bodyHtml: [
      paragraph(
        `<strong style="color:${BRAND.text};">${inviter}</strong> invited you to <strong style="color:${BRAND.text};">${project}</strong>.`,
      ),
      paragraph(
        `Your role will be <strong style="color:${BRAND.cta};">${role}</strong>. Accept to start collaborating.`,
      ),
      ctaButton(params.inviteUrl, "Accept invitation"),
      mutedNote(
        "This invitation expires in 7 days. If you were not expecting it, you can ignore this email.",
      ),
      mutedNote(
        "Link:<br /><span style=\"word-break:break-all;color:#5EEAD4;\">" +
          escapeHtml(params.inviteUrl) +
          "</span>",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function passwordResetTemplate(params: {
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = "Reset your Kavin Illam password";
  const text = `Reset your password:\n${params.resetUrl}\n\nThis link expires in 1 hour.\nIf you did not request this, ignore this email.\n\n— Kavin Illam`;

  const html = layout({
    preheader: "Reset your Kavin Illam password.",
    title: "Reset password",
    bodyHtml: [
      paragraph("Use the button below to choose a new password."),
      ctaButton(params.resetUrl, "Reset password"),
      mutedNote("This link expires in 1 hour."),
      mutedNote("If you did not request a reset, you can ignore this email."),
    ].join(""),
  });

  return { subject, text, html };
}

export function paymentRequestNotifyTemplate(params: {
  href: string;
  projectName: string;
  requestNumber: string;
  title: string;
  amount: string;
  requesterName: string;
}): { subject: string; text: string; html: string } {
  const subject = `[${params.projectName}] Payment request ${params.requestNumber}`;
  const text = `${params.requesterName} requested ${params.amount} for "${params.title}" (${params.requestNumber}).\n\nReview: ${params.href}\n\n— Kavin Illam`;

  const html = layout({
    preheader: `New payment request on ${params.projectName}.`,
    title: "Payment request",
    bodyHtml: [
      paragraph(
        `<strong style="color:${BRAND.text};">${escapeHtml(params.requesterName)}</strong> requested <strong style="color:${BRAND.cta};">${escapeHtml(params.amount)}</strong>.`,
      ),
      paragraph(
        `${escapeHtml(params.title)} · ${escapeHtml(params.requestNumber)}`,
      ),
      ctaButton(params.href, "Review request"),
    ].join(""),
    footerNote: `${params.projectName} · Kavin Illam`,
  });

  return { subject, text, html };
}
