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
