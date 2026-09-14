import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateTransactionReceiptPdf } from "@/server/pdf/generate-transaction-receipt";

export const runtime = "nodejs";

function contentDisposition(fileName: string): string {
  const safe = fileName.replace(/["\r\n]/g, "_");
  return `attachment; filename="${safe}"`;
}

/**
 * Direct binary PDF download for a single authorized transaction receipt.
 * Never uses the application DOM or browser print.
 */
export async function GET(
  _request: Request,
  context: {
    params: Promise<{ slug: string; transactionId: string }>;
  },
) {
  try {
    const { slug, transactionId } = await context.params;
    const pdf = await generateTransactionReceiptPdf(slug, transactionId);

    return new NextResponse(new Uint8Array(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": pdf.contentType,
        "Content-Disposition": contentDisposition(pdf.fileName),
        "Cache-Control": "private, no-store",
        "Content-Length": String(pdf.bytes.byteLength),
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    logger.error("Transaction receipt PDF failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
