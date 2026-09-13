import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { buildReportCsv } from "@/server/reports/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; reportId: string }> },
) {
  try {
    const { slug, reportId } = await context.params;
    const report = await buildReportCsv(slug, reportId);

    logger.info("Report CSV exported", {
      slug,
      reportId,
      rowCount: report.rowCount,
    });

    return new NextResponse(report.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
