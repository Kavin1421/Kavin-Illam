import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { generateLoanReceiptPdf } from "@/server/pdf/generate-loan-receipt";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; txnId: string }> },
) {
  try {
    const { slug, txnId } = await context.params;
    const pdf = await generateLoanReceiptPdf(slug, txnId);

    return new NextResponse(new Uint8Array(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": pdf.contentType,
        "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
