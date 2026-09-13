export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const defaultMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "You must be signed in to continue.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "The submitted data is invalid.",
  CONFLICT: "This action conflicts with the current state.",
  RATE_LIMITED: "Too many requests. Please try again shortly.",
  INTERNAL: "Something went wrong. Please try again.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message?: string, status?: number) {
    super(message ?? defaultMessages[code]);
    this.name = "AppError";
    this.code = code;
    this.status =
      status ??
      ({
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        VALIDATION: 400,
        CONFLICT: 409,
        RATE_LIMITED: 429,
        INTERNAL: 500,
      }[code] as number);
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  return defaultMessages.INTERNAL;
}
