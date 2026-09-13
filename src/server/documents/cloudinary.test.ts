import { describe, expect, it } from "vitest";

import { shouldUseCloudinaryDownloadApi } from "./cloudinary";

describe("shouldUseCloudinaryDownloadApi", () => {
  it("uses download API for explicit downloads", () => {
    expect(
      shouldUseCloudinaryDownloadApi({
        forDownload: true,
        format: "png",
        resourceType: "image",
      }),
    ).toBe(true);
  });

  it("uses download API for PDFs (CDN often returns 401)", () => {
    expect(
      shouldUseCloudinaryDownloadApi({
        format: "pdf",
        resourceType: "image",
      }),
    ).toBe(true);
  });

  it("uses download API for raw assets", () => {
    expect(
      shouldUseCloudinaryDownloadApi({
        format: "docx",
        resourceType: "raw",
      }),
    ).toBe(true);
  });

  it("keeps CDN delivery for ordinary images", () => {
    expect(
      shouldUseCloudinaryDownloadApi({
        format: "png",
        resourceType: "image",
      }),
    ).toBe(false);
  });
});
