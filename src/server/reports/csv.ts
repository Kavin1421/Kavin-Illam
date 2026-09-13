/**
 * CSV serialization — server-side only. Never trust client-built aggregates.
 */

export function escapeCsvCell(
  value: string | number | null | undefined,
): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

export function rowsToCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

/** Paise → rupee string with 2 decimals for CSV (no locale commas). */
export function paiseToCsvRupees(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error("CSV money amounts must be integer paise.");
  }
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
