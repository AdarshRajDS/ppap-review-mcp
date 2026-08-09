import { useState } from "react";
import type { PPAPFinding, SqeDecision } from "../types.ts";
import { EvidenceComparison } from "./EvidenceComparison.tsx";

const DECISIONS: { value: SqeDecision; label: string }[] = [
  { value: "ACCEPT_FINDING", label: "Accept Finding" },
  { value: "FALSE_POSITIVE", label: "False Positive" },
  { value: "SUPPLIER_CLARIFICATION", label: "Supplier Clarification" },
  { value: "INTERNAL_REVIEW", label: "Internal Review" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
  { value: "RESOLVED", label: "Resolved" },
];

export function FindingDetail({
  finding,
  busy,
  error,
  onSave,
}: {
  finding: PPAPFinding;
  busy: boolean;
  error?: string | null;
  onSave: (decision: SqeDecision, comment: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<SqeDecision>(
    finding.sqeDecision ?? "SUPPLIER_CLARIFICATION",
  );
  const [comment, setComment] = useState("");

  return (
    <section className="panel">
      <h2>
        {finding.id} — {finding.title}
      </h2>
      <dl className="meta-grid">
        <div>
          <dt>Category</dt>
          <dd>{finding.category}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{finding.preliminarySeverity.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{finding.confidence}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{finding.status.replaceAll("_", " ")}</dd>
        </div>
      </dl>

      <h3>Observation</h3>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>{finding.observation}</p>

      {finding.recommendedNextStep ? (
        <>
          <h3>Recommended next step</h3>
          <p className="muted" style={{ margin: 0 }}>
            {finding.recommendedNextStep}
          </p>
        </>
      ) : null}

      <h3>Evidence</h3>
      <EvidenceComparison finding={finding} />

      <h3>SQE Decision</h3>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="decision-form">
        <label>
          Decision
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value as SqeDecision)}
            disabled={busy}
          >
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comment
          <textarea
            rows={3}
            placeholder="Add SQE comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
          />
        </label>
        <div className="decision-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => onSave(decision, comment)}
          >
            {busy ? "Saving…" : "Save Decision"}
          </button>
        </div>
      </div>

      {finding.comments.length > 0 ? (
        <>
          <h3>Comments</h3>
          <div className="audit-list">
            {finding.comments.map((c) => (
              <div key={c.id} className="audit-item">
                <strong>{c.reviewer ?? "SQE"}</strong> ·{" "}
                <span className="muted">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
                <div>{c.text}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
