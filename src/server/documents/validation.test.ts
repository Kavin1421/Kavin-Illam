import { describe, expect, it } from "vitest";

import {
  assertOwnedPublicId,
  buildDocumentPublicId,
  projectDocumentFolder,
} from "@/server/documents/cloudinary";
import {
  canPreviewInline,
  extensionOf,
  sanitizeFileName,
  validateUploadFile,
} from "@/server/documents/validation";

describe("document validation", () => {
  it("rejects dangerous extensions even with spoofed mime", () => {
    expect(() =>
      validateUploadFile({
        fileName: "payload.exe",
        mimeType: "application/pdf",
        fileSize: 1000,
      }),
    ).toThrow(/not allowed/i);

    expect(() =>
      validateUploadFile({
        fileName: "note.html",
        mimeType: "text/html",
        fileSize: 1000,
      }),
    ).toThrow(/not allowed/i);
  });

  it("accepts pdf and images within size limit", () => {
    const pdf = validateUploadFile({
      fileName: "contract.PDF",
      mimeType: "application/pdf",
      fileSize: 1024,
    });
    expect(pdf.extension).toBe("pdf");
    expect(pdf.resourceType).toBe("image");

    const png = validateUploadFile({
      fileName: "site.png",
      mimeType: "image/png",
      fileSize: 2048,
    });
    expect(png.resourceType).toBe("image");
  });

  it("rejects oversized files", () => {
    expect(() =>
      validateUploadFile({
        fileName: "big.pdf",
        mimeType: "application/pdf",
        fileSize: 26 * 1024 * 1024,
      }),
    ).toThrow(/25 MB/i);
  });

  it("sanitizes file names", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(extensionOf("a.b.JPEG")).toBe("jpeg");
  });

  it("detects previewable types", () => {
    expect(canPreviewInline("application/pdf", "image")).toBe(true);
    expect(canPreviewInline("image/png", "image")).toBe(true);
    expect(canPreviewInline("application/msword", "raw")).toBe(false);
  });
});

describe("document public id ownership", () => {
  it("builds ids under the project folder", () => {
    const projectId = "abc123";
    const id = buildDocumentPublicId(projectId, "My Contract!");
    expect(id.startsWith(projectDocumentFolder(projectId) + "/")).toBe(true);
    expect(() => assertOwnedPublicId(projectId, id)).not.toThrow();
    expect(() =>
      assertOwnedPublicId(projectId, "other-project/stolen"),
    ).toThrow(/invalid/i);
  });
});
