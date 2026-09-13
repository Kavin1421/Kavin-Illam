import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { prepareDocumentUpload } from "@/server/documents/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const signed = await prepareDocumentUpload(slug, body);
    return NextResponse.json(signed);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
