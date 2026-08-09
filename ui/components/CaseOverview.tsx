import type { PPAPCase } from "../types.ts";

export function CaseOverview({ ppapCase }: { ppapCase: PPAPCase }) {
  const critical = ppapCase.findings.filter(
    (f) => f.preliminarySeverity === "CRITICAL_REVIEW",
  ).length;
  const major = ppapCase.findings.filter(
    (f) => f.preliminarySeverity === "MAJOR_REVIEW",
  ).length;
  const clarification = ppapCase.findings.filter(
    (f) => f.preliminarySeverity === "CLARIFICATION",
  ).length;

  return (
    <section className="panel">
      <h2>Case Overview</h2>
      <dl className="meta-grid">
        <div>
          <dt>Supplier</dt>
          <dd>{ppapCase.supplier.name}</dd>
        </div>
        <div>
          <dt>Part</dt>
          <dd>
            {ppapCase.part.number} — {ppapCase.part.name}
          </dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{ppapCase.submission.customer}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>{ppapCase.part.drawingRevision}</dd>
        </div>
        <div>
          <dt>Submission reason</dt>
          <dd>{ppapCase.submission.reason}</dd>
        </div>
        <div>
          <dt>Profile</dt>
          <dd>{ppapCase.submission.profile}</dd>
        </div>
      </dl>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="value">{ppapCase.documents.length}</div>
          <div className="label">Documents</div>
        </div>
        <div className="summary-card">
          <div className="value">{ppapCase.findings.length}</div>
          <div className="label">Review Findings</div>
        </div>
        <div className="summary-card">
          <div className="value">{critical}</div>
          <div className="label">Critical Review</div>
        </div>
        <div className="summary-card">
          <div className="value">{major}</div>
          <div className="label">Major Review</div>
        </div>
        <div className="summary-card">
          <div className="value">{clarification}</div>
          <div className="label">Clarifications</div>
        </div>
      </div>

      <p className="disclaimer">
        Final PPAP disposition remains with the authorised SQE.
      </p>
    </section>
  );
}
