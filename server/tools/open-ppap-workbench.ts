import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CaseIdInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { buildReviewSummary, compactCaseSummary } from "./helpers.js";

export async function openPpapWorkbench(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = CaseIdInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid open_ppap_workbench payload: ${parsed.error.message}`,
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
  const payload = {
    case: ppapCase,
    reviewSummary: summary,
    summaryText: compactCaseSummary(ppapCase),
  };

  return {
    content: [
      {
        type: "text",
        text: `${payload.summaryText}\n\nWorkbench opened for interactive SQE review.`,
      },
    ],
    structuredContent: payload as unknown as Record<string, unknown>,
  };
}
