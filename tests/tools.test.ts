import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDemoCase } from "../server/demo-data.js";
import { FilePPAPStore, resetDefaultStore } from "../server/store.js";
import { addFindingComment } from "../server/tools/add-finding-comment.js";
import { createPpapCase } from "../server/tools/create-ppap-case.js";
import { getPpapCase } from "../server/tools/get-ppap-case.js";
import { getReviewSummary } from "../server/tools/get-review-summary.js";
import { setFindingDecision } from "../server/tools/set-finding-decision.js";
import { AppError } from "../server/types.js";

describe("MCP tool handlers", () => {
  let dir: string;
  let store: FilePPAPStore;

  afterEach(async () => {
    resetDefaultStore();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  async function seeded() {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ppap-tools-"));
    store = new FilePPAPStore(path.join(dir, "ppap-cases.json"));
    await store.createCase(createDemoCase());
    return store;
  }

  it("creates a case", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ppap-tools-"));
    store = new FilePPAPStore(path.join(dir, "ppap-cases.json"));
    const demo = createDemoCase();
    demo.caseId = "PP-NEW-1";
    const result = await createPpapCase(store, { case: demo });
    expect(result.structuredContent).toMatchObject({
      success: true,
      caseId: "PP-NEW-1",
    });
  });

  it("rejects duplicate create", async () => {
    await seeded();
    await expect(
      createPpapCase(store, { case: createDemoCase() }),
    ).rejects.toMatchObject({ code: "CASE_ALREADY_EXISTS" });
  });

  it("retrieves a case and errors on invalid id", async () => {
    await seeded();
    const ok = await getPpapCase(store, { caseId: "PP-10482" });
    expect(ok.structuredContent).toMatchObject({ caseId: "PP-10482" });
    await expect(getPpapCase(store, { caseId: "MISSING" })).rejects.toMatchObject({
      code: "CASE_NOT_FOUND",
    });
  });

  it("updates finding decision with audit + comment persistence", async () => {
    await seeded();
    const result = await setFindingDecision(store, {
      caseId: "PP-10482",
      findingId: "F-001",
      decision: "SUPPLIER_CLARIFICATION",
      reviewer: "SQE Test",
      comment: "Supplier must issue corrected PSW.",
    });
    const payload = result.structuredContent as {
      updatedFinding: { sqeDecision: string; comments: { text: string }[] };
      reviewSummary: { supplierClarificationFindings: number };
    };
    expect(payload.updatedFinding.sqeDecision).toBe("SUPPLIER_CLARIFICATION");
    expect(payload.updatedFinding.comments.at(-1)?.text).toContain("corrected PSW");
    expect(payload.reviewSummary.supplierClarificationFindings).toBeGreaterThan(0);

    const saved = await store.getCase("PP-10482");
    expect(saved?.auditTrail.some((a) => a.action === "FINDING_DECISION")).toBe(
      true,
    );
  });

  it("rejects invalid decision and finding id", async () => {
    await seeded();
    await expect(
      setFindingDecision(store, {
        caseId: "PP-10482",
        findingId: "F-001",
        decision: "AI_APPROVED",
      }),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      setFindingDecision(store, {
        caseId: "PP-10482",
        findingId: "F-999",
        decision: "RESOLVED",
      }),
    ).rejects.toMatchObject({ code: "FINDING_NOT_FOUND" });
  });

  it("persists comments and rejects empty ones", async () => {
    await seeded();
    const result = await addFindingComment(store, {
      caseId: "PP-10482",
      findingId: "F-002",
      comment: "Need material confirmation.",
    });
    const finding = (
      result.structuredContent as {
        updatedFinding: { comments: { text: string }[] };
      }
    ).updatedFinding;
    expect(finding.comments.some((c) => c.text.includes("material"))).toBe(true);

    await expect(
      addFindingComment(store, {
        caseId: "PP-10482",
        findingId: "F-002",
        comment: "   ",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("calculates review summary including traceability gaps", async () => {
    await seeded();
    const result = await getReviewSummary(store, { caseId: "PP-10482" });
    const summary = result.structuredContent as {
      totalDocuments: number;
      totalFindings: number;
      processTraceabilityGapIds: string[];
      characteristicTraceabilityGapIds: string[];
    };
    expect(summary.totalDocuments).toBe(12);
    expect(summary.totalFindings).toBe(6);
    expect(summary.processTraceabilityGapIds).toContain("OP40");
    expect(summary.characteristicTraceabilityGapIds).toContain("CC-07");
  });
});
