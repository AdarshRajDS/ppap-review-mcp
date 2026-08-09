import type { PPAPFinding } from "../types.ts";

export function EvidenceComparison({ finding }: { finding: PPAPFinding }) {
  const evidence = finding.evidence;

  if (evidence.length >= 2) {
    const left = evidence[0]!;
    const right = evidence[1]!;
    return (
      <div>
        <div className="evidence-compare">
          <article className="evidence-card">
            <div className="muted">{left.documentName}</div>
            <div style={{ fontWeight: 700, marginTop: "0.25rem" }}>
              {left.label}
            </div>
            <div className="value">{left.value}</div>
            <div className="muted">
              {[
                left.page ? `Page ${left.page}` : null,
                left.sheet ? `Sheet ${left.sheet}` : null,
                left.sourceReference,
              ]
                .filter(Boolean)
                .join(" / ")}
            </div>
          </article>
          <article className="evidence-card">
            <div className="muted">{right.documentName}</div>
            <div style={{ fontWeight: 700, marginTop: "0.25rem" }}>
              {right.label}
            </div>
            <div className="value">{right.value}</div>
            <div className="muted">
              {[
                right.page ? `Page ${right.page}` : null,
                right.sheet ? `Sheet ${right.sheet}` : null,
                right.sourceReference,
              ]
                .filter(Boolean)
                .join(" / ")}
            </div>
          </article>
        </div>
        <p className="muted" style={{ marginTop: "0.55rem" }}>
          Observation: The values differ. The human decides significance.
        </p>
        {evidence.length > 2 ? (
          <div className="table-wrap" style={{ marginTop: "0.55rem" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Document</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {evidence.slice(2).map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.label}</td>
                    <td>{ev.value}</td>
                    <td>{ev.documentName}</td>
                    <td>{ev.sourceReference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
            <th>Document</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.label}</td>
              <td>{ev.value}</td>
              <td>{ev.documentName}</td>
              <td>{ev.sourceReference ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
