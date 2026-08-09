import { describe, expect, it } from "vitest";
import { createDemoCase } from "../server/demo-data.js";
import { PPAPCaseSchema } from "../server/schemas.js";

describe("PPAP case schema validation", () => {
  it("accepts the seeded demo case", () => {
    const result = PPAPCaseSchema.safeParse(createDemoCase());
    expect(result.success).toBe(true);
  });

  it("rejects invalid severity values", () => {
    const bad = createDemoCase();
    // @ts-expect-error intentional invalid enum
    bad.findings[0].preliminarySeverity = "AI_APPROVED";
    expect(PPAPCaseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing required case fields", () => {
    expect(PPAPCaseSchema.safeParse({ caseId: "X" }).success).toBe(false);
  });
});
