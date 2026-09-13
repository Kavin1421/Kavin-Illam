const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export function formatDateTime(
  value: Date | string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(
  value: Date | string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
  }).format(date);
}

export { DEFAULT_TIME_ZONE };
