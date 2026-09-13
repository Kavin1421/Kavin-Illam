import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

/**
 * Liveness/readiness probe for Docker, Nginx, and load balancers.
 * Excluded from Auth.js middleware (see src/middleware.ts).
 */
export async function GET() {
  const started = Date.now();

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return NextResponse.json({
      status: "ok" as const,
      service: "kavin-illam",
      environment: env.NODE_ENV,
      database: "up",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        status: "degraded" as const,
        service: "kavin-illam",
        environment: env.NODE_ENV,
        database: "down",
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
