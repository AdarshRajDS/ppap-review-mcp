import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CaseIdInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { buildReviewSummary } from "./helpers.js";

export async function getReviewSummary(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = CaseIdInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid get_review_summary payload: ${parsed.error.message}`,
    );
  }

  const ppapCase = await store.getCase(parsed.data.caseId);
  if (!ppapCase) {
    throw new AppError(
      "CASE_NOT_FOUND",
      `Case ${parsed.data.caseId} was not found.`,
    );
  }

  const summary = buildReviewSummary(ppapCase);
  return {
    content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    structuredContent: summary as unknown as Record<string, unknown>,
  };
}
