import { NextResponse } from "next/server";

import { AppError, toUserMessage } from "@/lib/errors";
import { issueDocumentUrl } from "@/server/documents/service";

function contentDisposition(fileName: string, download: boolean): string {
  const safe = fileName.replace(/["\r\n]/g, "_");
  const type = download ? "attachment" : "inline";
  return `${type}; filename="${safe}"`;
}

function guessContentType(fileName: string, upstreamType: string | null): string {
  if (upstreamType && upstreamType !== "application/octet-stream") {
    return upstreamType;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return upstreamType || "application/octet-stream";
}

/**
 * Same-origin document stream after permission checks.
 * Cloudinary CDN returns 401 for many PDF deliveries; this path uses the
 * working Admin download URL server-side and streams bytes to the browser.
 */
export async function GET(
  request: Request,
  context: {
    params: Promise<{ slug: string; documentId: string }>;
  },
) {
  try {
    const { slug, documentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";
    const versionId = searchParams.get("versionId") ?? undefined;

    const issued = await issueDocumentUrl(slug, documentId, {
      download,
      versionId,
    });

    const upstream = await fetch(issued.url, { redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Could not fetch document from storage." },
        { status: 502 },
      );
    }

    const contentType = guessContentType(
      issued.fileName,
      upstream.headers.get("content-type"),
    );

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(issued.fileName, download),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
