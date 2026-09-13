import { describe, expect, it } from "vitest";

import {
  escapeCsvCell,
  paiseToCsvRupees,
  rowsToCsv,
} from "@/server/reports/csv";

describe("CSV helpers", () => {
  it("escapes commas quotes and newlines", () => {
    expect(escapeCsvCell('Hello, "world"')).toBe('"Hello, ""world"""');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
  });

  it("serializes header + rows with trailing newline", () => {
    const csv = rowsToCsv(
      ["name", "amount"],
      [
        ["Cement", "125000.00"],
        ['Steel, "TMT"', "75000.00"],
      ],
    );
    expect(csv).toBe(
      'name,amount\nCement,125000.00\n"Steel, ""TMT""",75000.00\n',
    );
  });

  it("formats paise as plain rupee decimals", () => {
    expect(paiseToCsvRupees(12_500_000)).toBe("125000.00");
    expect(paiseToCsvRupees(50)).toBe("0.50");
    expect(paiseToCsvRupees(-100)).toBe("-1.00");
    expect(() => paiseToCsvRupees(1.5)).toThrow(/integer/i);
  });
});
