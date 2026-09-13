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
