import type { PPAPCase, ReviewStatus } from "../types.ts";

function statusLabel(status: ReviewStatus): string {
  return status.replaceAll("_", " ");
}

export function Header({
  ppapCase,
  mockMode,
}: {
  ppapCase: PPAPCase;
  mockMode?: boolean;
}) {
  return (
    <header className="header">
      <div>
        <h1>PPAP Review</h1>
        <div className="header-meta" style={{ marginTop: "0.35rem" }}>
          <span>
            Case: <strong>{ppapCase.caseId}</strong>
          </span>
          <span>
            Supplier: <strong>{ppapCase.supplier.name}</strong>
          </span>
          <span>
            Part: <strong>{ppapCase.part.number}</strong>
          </span>
          <span>
            Revision: <strong>{ppapCase.part.drawingRevision}</strong>
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        {mockMode ? <span className="badge mock">Mock Development Mode</span> : null}
        <span className="badge">{statusLabel(ppapCase.review.status)}</span>
      </div>
    </header>
  );
}
