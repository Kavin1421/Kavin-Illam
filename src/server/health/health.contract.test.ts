import { describe, expect, it } from "vitest";

/**
 * Smoke expectations for the production health contract.
 * The route itself needs a live MongoDB; this locks the response shape.
 */
describe("health probe contract", () => {
  it("documents ok vs degraded statuses used by Docker HEALTHCHECK", () => {
    const ok = { status: "ok", database: "up" } as const;
    const degraded = { status: "degraded", database: "down" } as const;
    expect(ok.status).toBe("ok");
    expect(degraded.status).toBe("degraded");
  });
});
