import { describe, expect, it } from "vitest";

import {
  DEFAULT_FINANCIAL_ACCOUNT_SEEDS,
  SYSTEM_CATEGORY_SEEDS,
} from "@/server/finance/default-seeds";

describe("finance dropdown seed catalogs", () => {
  it("includes Indian Bank among default accounts", () => {
    const names = DEFAULT_FINANCIAL_ACCOUNT_SEEDS.map((a) => a.name);
    expect(names).toContain("Indian Bank");
    expect(names).toContain("HDFC Bank");
    expect(names).toContain("Cash");
  });

  it("ships a full system category catalog for form dropdowns", () => {
    expect(SYSTEM_CATEGORY_SEEDS.length).toBeGreaterThanOrEqual(20);
    expect(SYSTEM_CATEGORY_SEEDS.map((c) => c.code)).toContain("ENGINEERING");
    expect(SYSTEM_CATEGORY_SEEDS.map((c) => c.code)).toContain("CEMENT");
  });
});
