import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { AddFindingCommentInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { appendAudit, newId, nowIso } from "./helpers.js";

export async function addFindingComment(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = AddFindingCommentInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid add_finding_comment payload: ${parsed.error.message}`,
    );
  }

  const { caseId, findingId, comment, reviewer } = parsed.data;
  if (!comment.trim()) {
    throw new AppError("EMPTY_COMMENT", "Comment must not be empty.");
  }

  const updated = await store.updateCase(caseId, (current) => {
    const idx = current.findings.findIndex((f) => f.id === findingId);
    if (idx < 0) {
      throw new AppError(
        "FINDING_NOT_FOUND",
        `Finding ${findingId} was not found in case ${caseId}.`,
      );
    }

    const timestamp = nowIso();
    const finding = current.findings[idx]!;
    const nextFinding = {
      ...finding,
      updatedAt: timestamp,
      comments: [
        ...finding.comments,
        {
          id: newId("CMT"),
          text: comment.trim(),
          reviewer: reviewer ?? "SQE",
          createdAt: timestamp,
        },
      ],
    };

    const findings = [...current.findings];
    findings[idx] = nextFinding;

    return {
      ...current,
      findings,
      updatedAt: timestamp,
      auditTrail: appendAudit(current.auditTrail, {
        action: "FINDING_COMMENT",
        entityType: "FINDING",
        entityId: findingId,
        actorType: "SQE",
        actor: reviewer ?? "SQE",
        comment: comment.trim(),
      }),
    };
  });

  const finding = updated.findings.find((f) => f.id === findingId)!;
  const result = {
    success: true,
    caseId,
    findingId,
    updatedFinding: finding,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}
