import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    const payload = {
      status: "ok" as const,
      service: "kavin-illam",
      environment: env.NODE_ENV,
      database: "up",
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload);
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
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
