import type {
  AuditEvent,
  FindingStatus,
  PPAPCase,
  PPAPFinding,
  ReviewStatus,
  ReviewSummary,
  SqeDecision,
} from "../types.js";

const UNRESOLVED: FindingStatus[] = ["OPEN", "AWAITING_SQE"];

export function nowIso(): string {
  return new Date().toISOString();
}

/** Works in Node and browser (MCP App bundle). */
export function newId(prefix: string): string {
  const id = globalThis.crypto.randomUUID().slice(0, 8);
  return `${prefix}-${id}`;
}

export function decisionToStatus(decision: SqeDecision): FindingStatus {
  switch (decision) {
    case "ACCEPT_FINDING":
      return "SQE_CONFIRMED";
    case "FALSE_POSITIVE":
      return "FALSE_POSITIVE";
    case "SUPPLIER_CLARIFICATION":
      return "SUPPLIER_CLARIFICATION";
    case "INTERNAL_REVIEW":
      return "INTERNAL_REVIEW";
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE";
    case "RESOLVED":
      return "RESOLVED";
  }
}

export function appendAudit(
  trail: AuditEvent[],
  event: Omit<AuditEvent, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): AuditEvent[] {
  const entry: AuditEvent = {
    id: event.id ?? newId("AUD"),
    timestamp: event.timestamp ?? nowIso(),
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    actorType: event.actorType,
    actor: event.actor,
    oldValue: event.oldValue,
    newValue: event.newValue,
    comment: event.comment,
  };
  return [...trail, entry];
}

export function suggestOperationalStatus(ppapCase: PPAPCase): ReviewStatus {
  const findings = ppapCase.findings;
  const hasSupplierClarification = findings.some(
    (f) => f.status === "SUPPLIER_CLARIFICATION" && !isTerminal(f),
  );
  if (hasSupplierClarification) {
    return "SUPPLIER_CLARIFICATION_REQUIRED";
  }

  const hasInternalReview = findings.some(
    (f) => f.status === "INTERNAL_REVIEW" && !isTerminal(f),
  );
  if (hasInternalReview) {
    return "INTERNAL_REVIEW_REQUIRED";
  }

  const allHaveHumanDecision = findings.every(
    (f) => f.sqeDecision !== undefined || isTerminal(f),
  );
  if (findings.length > 0 && allHaveHumanDecision) {
    return "READY_FOR_DISPOSITION";
  }

  return ppapCase.review.status === "INITIAL_REVIEW"
    ? "INITIAL_REVIEW"
    : "IN_REVIEW";
}

function isTerminal(finding: PPAPFinding): boolean {
  return (
    finding.status === "RESOLVED" ||
    finding.status === "NOT_APPLICABLE" ||
    finding.status === "FALSE_POSITIVE" ||
    finding.status === "SQE_CONFIRMED"
  );
}

export function isUnresolved(finding: PPAPFinding): boolean {
  return UNRESOLVED.includes(finding.status) || finding.sqeDecision === undefined;
}

export function buildReviewSummary(ppapCase: PPAPCase): ReviewSummary {
  const missingDocs = ppapCase.documents.filter((d) => d.status === "MISSING");
  const unresolved = ppapCase.findings.filter((f) => isUnresolved(f));
  const critical = ppapCase.findings.filter(
    (f) => f.preliminarySeverity === "CRITICAL_REVIEW",
  );
  const supplierClar = ppapCase.findings.filter(
    (f) =>
      f.status === "SUPPLIER_CLARIFICATION" ||
      f.sqeDecision === "SUPPLIER_CLARIFICATION",
  );
  const internal = ppapCase.findings.filter(
    (f) =>
      f.status === "INTERNAL_REVIEW" || f.sqeDecision === "INTERNAL_REVIEW",
  );
  const falsePositives = ppapCase.findings.filter(
    (f) =>
      f.status === "FALSE_POSITIVE" || f.sqeDecision === "FALSE_POSITIVE",
  );
  const resolved = ppapCase.findings.filter(
    (f) => f.status === "RESOLVED" || f.sqeDecision === "RESOLVED",
  );
  const processGaps = ppapCase.processTraceability.filter(
    (p) => p.status === "REVIEW_REQUIRED" || p.status === "POTENTIAL_GAP",
  );
  const charGaps = ppapCase.characteristicTraceability.filter(
    (c) => c.status === "REVIEW_REQUIRED" || c.status === "PARTIAL",
  );

  return {
    caseId: ppapCase.caseId,
    totalDocuments: ppapCase.documents.length,
    missingDocuments: missingDocs.length,
    missingDocumentIds: missingDocs.map((d) => d.id),
    totalFindings: ppapCase.findings.length,
    unresolvedFindings: unresolved.length,
    unresolvedFindingIds: unresolved.map((f) => f.id),
    criticalReviewItems: critical.length,
    criticalReviewFindingIds: critical.map((f) => f.id),
    supplierClarificationFindings: supplierClar.length,
    supplierClarificationFindingIds: supplierClar.map((f) => f.id),
    internalReviewFindings: internal.length,
    internalReviewFindingIds: internal.map((f) => f.id),
    falsePositives: falsePositives.length,
    falsePositiveFindingIds: falsePositives.map((f) => f.id),
    resolvedFindings: resolved.length,
    resolvedFindingIds: resolved.map((f) => f.id),
    processTraceabilityGaps: processGaps.length,
    processTraceabilityGapIds: processGaps.map((p) => p.operationId),
    characteristicTraceabilityGaps: charGaps.length,
    characteristicTraceabilityGapIds: charGaps.map((c) => c.id),
    currentReviewStatus: ppapCase.review.status,
    suggestedOperationalStatus: suggestOperationalStatus(ppapCase),
  };
}

export function compactCaseSummary(ppapCase: PPAPCase): string {
  const summary = buildReviewSummary(ppapCase);
  return [
    `PPAP case ${ppapCase.caseId}`,
    `Supplier: ${ppapCase.supplier.name}`,
    `Part: ${ppapCase.part.number} (${ppapCase.part.name}), Rev ${ppapCase.part.drawingRevision}`,
    `Documents: ${summary.totalDocuments}`,
    `Findings: ${summary.totalFindings} (${summary.unresolvedFindings} unresolved, ${summary.criticalReviewItems} critical)`,
    `Review status: ${ppapCase.review.status}`,
    `Suggested operational status: ${summary.suggestedOperationalStatus}`,
  ].join("\n");
}

/** Deep-merge patch into case while preserving SQE decisions, comments, and audit trail. */
export function mergeCasePatch(
  current: PPAPCase,
  patch: Record<string, unknown>,
): PPAPCase {
  const next: PPAPCase = structuredClone(current);

  if (patch.supplier && typeof patch.supplier === "object") {
    next.supplier = { ...next.supplier, ...(patch.supplier as object) };
  }
  if (patch.part && typeof patch.part === "object") {
    next.part = { ...next.part, ...(patch.part as object) };
  }
  if (patch.submission && typeof patch.submission === "object") {
    next.submission = { ...next.submission, ...(patch.submission as object) };
  }
  if (Array.isArray(patch.documents)) {
    next.documents = patch.documents as PPAPCase["documents"];
  }
  if (Array.isArray(patch.processTraceability)) {
    next.processTraceability =
      patch.processTraceability as PPAPCase["processTraceability"];
  }
  if (Array.isArray(patch.characteristicTraceability)) {
    next.characteristicTraceability =
      patch.characteristicTraceability as PPAPCase["characteristicTraceability"];
  }
  if (patch.review && typeof patch.review === "object") {
    next.review = { ...next.review, ...(patch.review as object) };
  }

  // Findings: merge by id; never erase SQE decisions/comments unless explicitly provided
  if (Array.isArray(patch.findings)) {
    const incoming = patch.findings as PPAPFinding[];
    const byId = new Map(next.findings.map((f) => [f.id, f]));
    for (const f of incoming) {
      const existing = byId.get(f.id);
      if (!existing) {
        byId.set(f.id, f);
        continue;
      }
      byId.set(f.id, {
        ...existing,
        ...f,
        sqeDecision: f.sqeDecision ?? existing.sqeDecision,
        comments:
          f.comments && f.comments.length > 0
            ? mergeComments(existing.comments, f.comments)
            : existing.comments,
        evidence: f.evidence?.length ? f.evidence : existing.evidence,
      });
    }
    next.findings = Array.from(byId.values());
  }

  // Audit trail is append-only from server; ignore patch.auditTrail erasure
  next.updatedAt = nowIso();
  return next;
}

function mergeComments(
  existing: PPAPFinding["comments"],
  incoming: PPAPFinding["comments"],
): PPAPFinding["comments"] {
  const ids = new Set(existing.map((c) => c.id));
  const merged = [...existing];
  for (const c of incoming) {
    if (!ids.has(c.id)) {
      merged.push(c);
      ids.add(c.id);
    }
  }
  return merged;
}
