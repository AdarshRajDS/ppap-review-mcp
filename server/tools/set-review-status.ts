import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetReviewStatusInputSchema } from "../schemas.js";
import type { PPAPStore } from "../store.js";
import { AppError } from "../types.js";
import { appendAudit, nowIso } from "./helpers.js";

export async function setReviewStatus(
  store: PPAPStore,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = SetReviewStatusInputSchema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid set_review_status payload: ${parsed.error.message}`,
    );
  }

  const { caseId, status, reviewer } = parsed.data;
  const updated = await store.updateCase(caseId, (current) => {
    const timestamp = nowIso();
    const oldStatus = current.review.status;
    return {
      ...current,
      updatedAt: timestamp,
      review: {
        ...current.review,
        status,
        reviewer: reviewer ?? current.review.reviewer,
        completedAt: status === "COMPLETED" ? timestamp : current.review.completedAt,
        startedAt: current.review.startedAt ?? timestamp,
      },
      auditTrail: appendAudit(current.auditTrail, {
        action: "REVIEW_STATUS_CHANGED",
        entityType: "REVIEW",
        entityId: caseId,
        actorType: "SQE",
        actor: reviewer ?? "SQE",
        oldValue: oldStatus,
        newValue: status,
      }),
    };
  });

  const result = {
    success: true,
    caseId,
    status: updated.review.status,
    review: updated.review,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}
