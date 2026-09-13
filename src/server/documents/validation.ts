/** File validation — never trust MIME alone; check extension + size. */

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_BY_EXT: Record<
  string,
  { mimePrefixes: string[]; resourceType: "image" | "raw" }
> = {
  pdf: { mimePrefixes: ["application/pdf"], resourceType: "image" },
  png: { mimePrefixes: ["image/png"], resourceType: "image" },
  jpg: { mimePrefixes: ["image/jpeg"], resourceType: "image" },
  jpeg: { mimePrefixes: ["image/jpeg"], resourceType: "image" },
  webp: { mimePrefixes: ["image/webp"], resourceType: "image" },
  gif: { mimePrefixes: ["image/gif"], resourceType: "image" },
  doc: { mimePrefixes: ["application/msword"], resourceType: "raw" },
  docx: {
    mimePrefixes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml",
    ],
    resourceType: "raw",
  },
  xls: { mimePrefixes: ["application/vnd.ms-excel"], resourceType: "raw" },
  xlsx: {
    mimePrefixes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml",
    ],
    resourceType: "raw",
  },
  csv: { mimePrefixes: ["text/csv", "application/csv", "text/plain"], resourceType: "raw" },
  txt: { mimePrefixes: ["text/plain"], resourceType: "raw" },
};

const DANGEROUS_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "js",
  "mjs",
  "cjs",
  "html",
  "htm",
  "svg",
  "php",
  "jar",
  "msi",
  "dll",
  "scr",
  "ps1",
]);

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
}

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export type ValidatedUpload = {
  fileName: string;
  extension: string;
  resourceType: "image" | "raw";
  mimeType: string;
  fileSize: number;
};

export function validateUploadFile(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): ValidatedUpload {
  const fileName = sanitizeFileName(input.fileName);
  const extension = extensionOf(fileName);

  if (!extension || DANGEROUS_EXT.has(extension)) {
    throw new Error("This file type is not allowed.");
  }

  const rule = ALLOWED_BY_EXT[extension];
  if (!rule) {
    throw new Error("This file type is not allowed.");
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    throw new Error("Invalid file size.");
  }
  if (input.fileSize > MAX_DOCUMENT_BYTES) {
    throw new Error("File exceeds the 25 MB limit.");
  }

  const mime = (input.mimeType || "").toLowerCase();
  const mimeOk =
    !mime ||
    rule.mimePrefixes.some((prefix) => mime.startsWith(prefix)) ||
    mime === "application/octet-stream";
  if (!mimeOk) {
    throw new Error("File type does not match its extension.");
  }

  return {
    fileName,
    extension,
    resourceType: rule.resourceType,
    mimeType: mime || rule.mimePrefixes[0],
    fileSize: input.fileSize,
  };
}

export function canPreviewInline(mimeType: string, resourceType: string): boolean {
  if (resourceType === "image") return true;
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
