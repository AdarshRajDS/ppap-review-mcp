import type { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PPAPCase, ReviewSummary, SqeDecision } from "./types.ts";

export interface WorkbenchPayload {
  case: PPAPCase;
  reviewSummary?: ReviewSummary;
  summaryText?: string;
}

export function parseToolResult(result: CallToolResult): WorkbenchPayload | null {
  const structured = result.structuredContent as
    | WorkbenchPayload
    | PPAPCase
    | undefined;

  if (structured && "case" in structured && structured.case?.caseId) {
    return structured as WorkbenchPayload;
  }
  if (structured && "caseId" in structured && "findings" in structured) {
    return { case: structured as PPAPCase };
  }

  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as WorkbenchPayload | PPAPCase;
    if ("case" in parsed && parsed.case?.caseId) {
      return parsed as WorkbenchPayload;
    }
    if ("caseId" in parsed && "findings" in parsed) {
      return { case: parsed as PPAPCase };
    }
  } catch {
    // not JSON — ignore
  }
  return null;
}

export function parseJsonResult<T>(result: CallToolResult): T {
  if (result.isError) {
    const text = result.content?.find((c) => c.type === "text")?.text;
    throw new Error(text ?? "Tool call failed");
  }
  if (result.structuredContent) {
    return result.structuredContent as T;
  }
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty tool result");
  return JSON.parse(text) as T;
}

export async function callSetFindingDecision(
  app: App,
  args: {
    caseId: string;
    findingId: string;
    decision: SqeDecision;
    reviewer?: string;
    comment?: string;
  },
) {
  const result = await app.callServerTool({
    name: "set_finding_decision",
    arguments: args,
  });
  return parseJsonResult<{
    success: boolean;
    caseId: string;
    findingId: string;
    decision: SqeDecision;
    updatedFinding: PPAPCase["findings"][number];
    reviewSummary: ReviewSummary;
  }>(result);
}

export async function callAddFindingComment(
  app: App,
  args: {
    caseId: string;
    findingId: string;
    comment: string;
    reviewer?: string;
  },
) {
  const result = await app.callServerTool({
    name: "add_finding_comment",
    arguments: args,
  });
  return parseJsonResult<{
    success: boolean;
    updatedFinding: PPAPCase["findings"][number];
  }>(result);
}

export async function callGetReviewSummary(app: App, caseId: string) {
  const result = await app.callServerTool({
    name: "get_review_summary",
    arguments: { caseId },
  });
  return parseJsonResult<ReviewSummary>(result);
}

export async function callGetPpapCase(app: App, caseId: string) {
  const result = await app.callServerTool({
    name: "get_ppap_case",
    arguments: { caseId },
  });
  return parseJsonResult<PPAPCase>(result);
}

export async function notifyHostDecision(
  app: App,
  payload: {
    caseId: string;
    findingId: string;
    decision: SqeDecision;
    comment?: string;
  },
): Promise<void> {
  try {
    await app.updateModelContext({
      structuredContent: {
        caseId: payload.caseId,
        event: "SQE_DECISION",
        findingId: payload.findingId,
        decision: payload.decision,
        comment: payload.comment,
      },
      content: [
        {
          type: "text",
          text: `SQE decision on ${payload.findingId}: ${payload.decision}${
            payload.comment ? ` — ${payload.comment}` : ""
          }`,
        },
      ],
    });
  } catch {
    // Host may not support model context updates; decisions are still persisted via tools.
  }
}
