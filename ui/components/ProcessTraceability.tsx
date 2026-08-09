import { useState } from "react";
import type { PPAPCase, ProcessTraceability } from "../types.ts";

function mark(present: boolean): string {
  return present ? "✓" : "—";
}

export function ProcessTraceabilityView({ ppapCase }: { ppapCase: PPAPCase }) {
  const [selected, setSelected] = useState<ProcessTraceability | null>(
    ppapCase.processTraceability.find((p) => p.operationId === "OP40") ??
      ppapCase.processTraceability[0] ??
      null,
  );

  return (
    <section className="panel">
      <h2>Process Traceability</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Operation</th>
              <th>Process Flow</th>
              <th>PFMEA</th>
              <th>Control Plan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ppapCase.processTraceability.map((op) => (
              <tr
                key={op.operationId}
                className={selected?.operationId === op.operationId ? "selected" : ""}
                onClick={() => setSelected(op)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  {op.operationId} {op.operationName}
                </td>
                <td>{mark(op.processFlow.present)}</td>
                <td
                  style={{
                    color: op.pfmea.present ? undefined : "var(--danger)",
                    fontWeight: op.pfmea.present ? undefined : 700,
                  }}
                >
                  {mark(op.pfmea.present)}
                </td>
                <td>{mark(op.controlPlan.present)}</td>
                <td>{op.status.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="panel" style={{ marginTop: "0.75rem" }}>
          <h3>
            {selected.operationId} — {selected.operationName}
          </h3>
          <dl className="meta-grid">
            <div>
              <dt>Process Flow</dt>
              <dd>
                {selected.processFlow.present ? "Present" : "Missing"}
                {selected.processFlow.evidence
                  ? ` — ${selected.processFlow.evidence}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>PFMEA</dt>
              <dd style={{ color: selected.pfmea.present ? undefined : "var(--danger)" }}>
                {selected.pfmea.present ? "Present" : "Missing"}
                {selected.pfmea.evidence ? ` — ${selected.pfmea.evidence}` : ""}
              </dd>
            </div>
            <div>
              <dt>Control Plan</dt>
              <dd>
                {selected.controlPlan.present ? "Present" : "Missing"}
                {selected.controlPlan.evidence
                  ? ` — ${selected.controlPlan.evidence}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selected.status.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
