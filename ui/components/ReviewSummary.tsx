import type { ReviewSummary } from "../types.ts";

export function ReviewSummaryView({
  summary,
  busy,
  onRefresh,
}: {
  summary: ReviewSummary;
  busy?: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="panel">
      <h2>Review Summary</h2>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="value">{summary.totalFindings}</div>
          <div className="label">Total Findings</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.unresolvedFindings}</div>
          <div className="label">Unresolved</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.criticalReviewItems}</div>
          <div className="label">Critical Review</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.supplierClarificationFindings}</div>
          <div className="label">Supplier Clarifications</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.internalReviewFindings}</div>
          <div className="label">Internal Reviews</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.falsePositives}</div>
          <div className="label">False Positives</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.resolvedFindings}</div>
          <div className="label">Resolved</div>
        </div>
      </div>

      <dl className="meta-grid" style={{ marginTop: "0.85rem" }}>
        <div>
          <dt>Current review status</dt>
          <dd>{summary.currentReviewStatus.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Suggested operational status</dt>
          <dd>{summary.suggestedOperationalStatus.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Process traceability gaps</dt>
          <dd>{summary.processTraceabilityGaps}</dd>
        </div>
        <div>
          <dt>Characteristic traceability gaps</dt>
          <dd>{summary.characteristicTraceabilityGaps}</dd>
        </div>
      </dl>

      <p className="disclaimer">
        Suggested status is derived from current human decisions only. This
        workbench does not approve or reject PPAP submissions.
      </p>

      <div className="decision-actions" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onRefresh}
        >
          {busy ? "Refreshing…" : "Refresh Review Summary"}
        </button>
      </div>
    </section>
  );
}
