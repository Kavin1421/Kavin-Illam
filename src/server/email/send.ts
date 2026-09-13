import nodemailer from "nodemailer";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function appBaseUrl(): string {
  if (env.AUTH_URL) return env.AUTH_URL;
  if (env.NEXTAUTH_URL) return env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = appBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function smtpConfigured(): boolean {
  return Boolean(
    env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM,
  );
}

function resendConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.SMTP_FROM);
}

export function isEmailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

async function sendViaSmtp(message: EmailMessage): Promise<void> {
  const port = Number(env.SMTP_PORT ?? "587");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function sendViaResend(message: EmailMessage): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.SMTP_FROM ?? "Kavin Illam <onboarding@resend.dev>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${response.status} ${body.slice(0, 200)}`);
  }
}

/**
 * Sends email when SMTP or Resend is configured.
 * In development without email config, logs a redacted stub (no secrets).
 */
export async function sendEmail(
  message: EmailMessage,
): Promise<{ delivered: boolean }> {
  try {
    if (smtpConfigured()) {
      await sendViaSmtp(message);
      logger.info("Email sent via SMTP", {
        to: message.to,
        subject: message.subject,
      });
      return { delivered: true };
    }

    if (resendConfigured()) {
      await sendViaResend(message);
      logger.info("Email sent via Resend", {
        to: message.to,
        subject: message.subject,
      });
      return { delivered: true };
    }

    logger.warn("Email not configured — message logged for development only", {
      to: message.to,
      subject: message.subject,
      textPreview: message.text.slice(0, 120),
    });
    return { delivered: false };
  } catch (error) {
    logger.error("Failed to send email", {
      to: message.to,
      subject: message.subject,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
