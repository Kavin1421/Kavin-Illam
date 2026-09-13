type LogFields = Record<string, unknown>;

function serialize(fields?: LogFields) {
  if (!fields) return "";
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("authorization") ||
      lower.includes("cookie")
    ) {
      safe[key] = "[redacted]";
      continue;
    }
    safe[key] = value;
  }
  return Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
}

function write(level: string, message: string, fields?: LogFields) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${serialize(fields)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    if (process.env.NODE_ENV === "production") return;
    write("debug", message, fields);
  },
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};
