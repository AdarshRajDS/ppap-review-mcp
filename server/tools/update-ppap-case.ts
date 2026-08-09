import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { UpdatePpapCaseInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { appendAudit, mergeCasePatch } from "./helpers.js";

export async function updatePpapCase(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = UpdatePpapCaseInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid update_ppap_case payload: ${parsed.error.message}`,
    );
  }

  const { caseId, patch } = parsed.data;
  const existing = await store.getCase(caseId);
  if (!existing) {
    throw new AppError("CASE_NOT_FOUND", `Case ${caseId} was not found.`);
  }

  const merged = mergeCasePatch(existing, patch);
  merged.auditTrail = appendAudit(merged.auditTrail, {
    action: "CASE_UPDATED",
    entityType: "CASE",
    entityId: caseId,
    actorType: "LANGDOCK",
    comment: "Case updated via update_ppap_case.",
  });

  const saved = await store.saveCase(merged);
  const result = {
    success: true,
    caseId: saved.caseId,
    findingsCount: saved.findings.length,
    documentsCount: saved.documents.length,
    message: "PPAP case updated.",
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}
