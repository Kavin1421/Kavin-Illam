/**
 * Pure helpers for dashboard category spend ranking (integer paise).
 */

export type CategorySpendSlice = {
  categoryId: string | null;
  categoryName: string;
  amount: number;
};

export function rankCategorySpend(
  slices: readonly CategorySpendSlice[],
  limit = 5,
): Array<CategorySpendSlice & { shareBps: number }> {
  const byKey = new Map<string, CategorySpendSlice>();

  for (const slice of slices) {
    if (!Number.isInteger(slice.amount) || slice.amount <= 0) continue;
    const key = slice.categoryId ?? "__none__";
    const existing = byKey.get(key);
    if (existing) {
      existing.amount += slice.amount;
    } else {
      byKey.set(key, { ...slice });
    }
  }

  const ranked = [...byKey.values()].sort((a, b) => b.amount - a.amount);
  const total = ranked.reduce((sum, row) => sum + row.amount, 0);
  const top = ranked.slice(0, limit);

  return top.map((row) => ({
    ...row,
    shareBps: total > 0 ? Math.round((row.amount * 10_000) / total) : 0,
  }));
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthlyMoneyPoint = {
  month: number; // 0–11
  label: string;
  spent: number;
  committed: number;
};

/**
 * Build a 12-month series for a calendar year (integer paise).
 * Dates are interpreted in Asia/Kolkata for month bucketing.
 */
export function buildMonthlyMoneySeries(
  spent: readonly { at: Date; amount: number }[],
  committed: readonly { at: Date; amount: number }[],
  year: number,
): MonthlyMoneyPoint[] {
  const spentByMonth = new Array<number>(12).fill(0);
  const committedByMonth = new Array<number>(12).fill(0);

  const bucket = (at: Date, amount: number, target: number[]) => {
    if (!Number.isInteger(amount) || amount <= 0) return;
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
    }).formatToParts(at);
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value) - 1;
    if (y !== year || m < 0 || m > 11) return;
    target[m]! += amount;
  };

  for (const row of spent) bucket(row.at, row.amount, spentByMonth);
  for (const row of committed) bucket(row.at, row.amount, committedByMonth);

  return MONTH_LABELS.map((label, month) => ({
    month,
    label,
    spent: spentByMonth[month]!,
    committed: committedByMonth[month]!,
  }));
}
