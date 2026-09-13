import { describe, expect, it } from "vitest";

import {
  assertMilestoneStatusTransition,
  assertTaskStatusTransition,
  isOpenTaskStatus,
} from "@/server/tasks/transitions";

describe("task status transitions", () => {
  it("allows TODO → IN_PROGRESS → DONE", () => {
    expect(() => assertTaskStatusTransition("TODO", "IN_PROGRESS")).not.toThrow();
    expect(() =>
      assertTaskStatusTransition("IN_PROGRESS", "DONE"),
    ).not.toThrow();
  });

  it("rejects invalid jumps", () => {
    expect(() => assertTaskStatusTransition("TODO", "DONE")).toThrow(
      /cannot move task/i,
    );
    expect(() => assertTaskStatusTransition("DONE", "CANCELLED")).toThrow(
      /cannot move task/i,
    );
  });

  it("identifies open statuses", () => {
    expect(isOpenTaskStatus("TODO")).toBe(true);
    expect(isOpenTaskStatus("BLOCKED")).toBe(true);
    expect(isOpenTaskStatus("DONE")).toBe(false);
  });
});

describe("milestone status transitions", () => {
  it("allows UPCOMING → IN_PROGRESS → COMPLETED", () => {
    expect(() =>
      assertMilestoneStatusTransition("UPCOMING", "IN_PROGRESS"),
    ).not.toThrow();
    expect(() =>
      assertMilestoneStatusTransition("IN_PROGRESS", "COMPLETED"),
    ).not.toThrow();
  });

  it("rejects CANCELLED → COMPLETED", () => {
    expect(() =>
      assertMilestoneStatusTransition("CANCELLED", "COMPLETED"),
    ).toThrow(/cannot move milestone/i);
  });
});
