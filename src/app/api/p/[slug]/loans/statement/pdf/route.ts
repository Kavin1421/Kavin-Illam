import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { generateLoanStatementPdf } from "@/server/pdf/generate-loan-statement";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const now = new Date();
    const year = Number.parseInt(
      url.searchParams.get("year") || String(now.getFullYear()),
      10,
    );
    const month = Number.parseInt(
      url.searchParams.get("month") || String(now.getMonth() + 1),
      10,
    );

    const pdf = await generateLoanStatementPdf(slug, year, month);

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
