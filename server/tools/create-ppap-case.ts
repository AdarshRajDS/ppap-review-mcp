import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CreatePpapCaseInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { appendAudit, nowIso } from "./helpers.js";

export async function createPpapCase(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = CreatePpapCaseInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid create_ppap_case payload: ${parsed.error.message}`,
    );
  }

  const ppapCase = {
    ...parsed.data.case,
    updatedAt: parsed.data.case.updatedAt || nowIso(),
    createdAt: parsed.data.case.createdAt || nowIso(),
    auditTrail: appendAudit(parsed.data.case.auditTrail ?? [], {
      action: "CASE_CREATED",
      entityType: "CASE",
      entityId: parsed.data.case.caseId,
      actorType: "LANGDOCK",
      comment: "Case created via create_ppap_case.",
    }),
  };

  const created = await store.createCase(ppapCase);
  const result = {
    success: true,
    caseId: created.caseId,
    findingsCount: created.findings.length,
    documentsCount: created.documents.length,
    message: "PPAP case created.",
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}
