import { describe, expect, it } from "vitest";

import { rankCategorySpend } from "@/server/dashboard/spend";

describe("dashboard spend ranking", () => {
  it("aggregates and ranks categories by amount with basis-point share", () => {
    const ranked = rankCategorySpend(
      [
        { categoryId: "c1", categoryName: "Cement", amount: 12_500_000 },
        { categoryId: "c2", categoryName: "Steel", amount: 7_500_000 },
        { categoryId: "c1", categoryName: "Cement", amount: 2_500_000 },
        { categoryId: "c3", categoryName: "Labour", amount: 5_000_000 },
      ],
      2,
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.categoryName).toBe("Cement");
    expect(ranked[0]?.amount).toBe(15_000_000);
    // Total of all categories = 27_500_000; cement share ≈ 54.55%
    expect(ranked[0]?.shareBps).toBe(5455);
    expect(ranked[1]?.categoryName).toBe("Steel");
  });

  it("ignores non-positive amounts", () => {
    expect(
      rankCategorySpend([
        { categoryId: "c1", categoryName: "Cement", amount: 0 },
        { categoryId: "c2", categoryName: "Steel", amount: -100 },
      ]),
    ).toEqual([]);
  });
});
