import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CaseIdInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";

export async function getPpapCase(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = CaseIdInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid get_ppap_case payload: ${parsed.error.message}`,
    );
  }

  const ppapCase = await store.getCase(parsed.data.caseId);
  if (!ppapCase) {
    throw new AppError(
      "CASE_NOT_FOUND",
      `Case ${parsed.data.caseId} was not found.`,
    );
  }

  return {
    content: [{ type: "text", text: JSON.stringify(ppapCase, null, 2) }],
    structuredContent: ppapCase as unknown as Record<string, unknown>,
  };
}
