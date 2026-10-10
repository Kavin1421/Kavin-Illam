/** Integer minor-unit helpers. Never use floating-point for money math. */

export function formatInrFromPaise(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error("Money amounts must be integer minor units (paise).");
  }
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Receipt PDFs use Helvetica, which has no ₹ glyph.
 * "Rs." keeps the same Indian grouping without a missing character.
 */
export function formatInrForPdf(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error("Money amounts must be integer minor units (paise).");
  }
  const negative = paise < 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(paise) / 100);
  return `${negative ? "-" : ""}Rs. ${formatted}`;
}

/** Whole rupees when possible, so edit fields stay readable (`50000`, not `50000.00`). */
export function rupeeInputFromPaise(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error("Money amounts must be integer minor units (paise).");
  }
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const body =
    fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function paiseFromRupeeString(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid money amount.");
  }
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const paise =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt((fraction + "00").slice(0, 2), 10);
  return negative ? -paise : paise;
}
