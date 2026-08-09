import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetFindingDecisionInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import {
  appendAudit,
  buildReviewSummary,
  decisionToStatus,
  newId,
  nowIso,
} from "./helpers.js";

export async function setFindingDecision(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = SetFindingDecisionInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid set_finding_decision payload: ${parsed.error.message}`,
    );
  }

  const { caseId, findingId, decision, reviewer, comment } = parsed.data;

  const updated = await store.updateCase(caseId, (current) => {
    const idx = current.findings.findIndex((f) => f.id === findingId);
    if (idx < 0) {
      throw new AppError(
        "FINDING_NOT_FOUND",
        `Finding ${findingId} was not found in case ${caseId}.`,
      );
    }

    const finding = current.findings[idx]!;
    const oldStatus = finding.status;
    const oldDecision = finding.sqeDecision;
    const nextStatus = decisionToStatus(decision);
    const timestamp = nowIso();

    const nextFinding = {
      ...finding,
      status: nextStatus,
      sqeDecision: decision,
      updatedAt: timestamp,
      comments: [...finding.comments],
    };

    if (comment?.trim()) {
      nextFinding.comments.push({
        id: newId("CMT"),
        text: comment.trim(),
        reviewer: reviewer ?? "SQE",
        createdAt: timestamp,
      });
    }

    const findings = [...current.findings];
    findings[idx] = nextFinding;

    let auditTrail = appendAudit(current.auditTrail, {
      action: "FINDING_DECISION",
      entityType: "FINDING",
      entityId: findingId,
      actorType: "SQE",
      actor: reviewer ?? "SQE",
      oldValue: oldDecision ?? oldStatus,
      newValue: decision,
      comment: comment?.trim(),
    });

    if (comment?.trim()) {
      auditTrail = appendAudit(auditTrail, {
        action: "FINDING_COMMENT",
        entityType: "FINDING",
        entityId: findingId,
        actorType: "SQE",
        actor: reviewer ?? "SQE",
        comment: comment.trim(),
      });
    }

    return {
      ...current,
      findings,
      updatedAt: timestamp,
      review: {
        ...current.review,
        reviewer: reviewer ?? current.review.reviewer,
        status:
          current.review.status === "INITIAL_REVIEW"
            ? "IN_REVIEW"
            : current.review.status,
      },
      auditTrail,
    };
  });

  const finding = updated.findings.find((f) => f.id === findingId)!;
  const reviewSummary = buildReviewSummary(updated);
  const result = {
    success: true,
    caseId,
    findingId,
    decision,
    updatedFinding: finding,
    reviewSummary,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}
