import { describe, expect, it } from "vitest";

import { formatInrFromPaise, paiseFromRupeeString } from "./money";

describe("money helpers", () => {
  it("formats INR from paise with Indian grouping", () => {
    expect(formatInrFromPaise(50000000)).toContain("5,00,000");
  });

  it("parses rupee strings into integer paise", () => {
    expect(paiseFromRupeeString("500.50")).toBe(50050);
    expect(paiseFromRupeeString("1,25,000")).toBe(12500000);
  });

  it("rejects non-integer paise formatting", () => {
    expect(() => formatInrFromPaise(1.5)).toThrow(/integer/);
  });
});
