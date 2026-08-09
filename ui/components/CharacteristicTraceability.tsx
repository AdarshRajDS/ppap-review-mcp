import { useState } from "react";
import type {
  CharacteristicTraceability,
  PPAPCase,
  TraceEvidenceRef,
} from "../types.ts";

function stepClass(ref: TraceEvidenceRef, warnWhenMissing = false): string {
  if (!ref.present && warnWhenMissing) return "gap";
  if (!ref.present) return "warn";
  return "";
}

function Step({
  title,
  detail,
  mark,
  className,
  onOpen,
}: {
  title: string;
  detail: string;
  mark: string;
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`chain-step ${className ?? ""}`}
      onClick={onOpen}
      style={{ textAlign: "left", width: "100%" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <strong>{title}</strong>
        <span aria-hidden="true">{mark}</span>
      </div>
      <div className="muted" style={{ marginTop: "0.25rem" }}>
        {detail}
      </div>
    </button>
  );
}

export function CharacteristicTraceabilityView({
  ppapCase,
}: {
  ppapCase: PPAPCase;
}) {
  const [selected, setSelected] = useState<CharacteristicTraceability | null>(
    ppapCase.characteristicTraceability[0] ?? null,
  );
  const [openStep, setOpenStep] = useState<string | null>(null);

  if (!selected) {
    return (
      <section className="panel">
        <h2>Characteristic Traceability</h2>
        <p className="muted">No characteristic traceability records.</p>
      </section>
    );
  }

  const steps: {
    key: string;
    title: string;
    detail: string;
    mark: string;
    className?: string;
    ref: TraceEvidenceRef;
  }[] = [
    {
      key: "drawing",
      title: "Drawing",
      detail: selected.drawing.requirement ?? selected.drawing.evidence ?? "—",
      mark: selected.drawing.present ? "✓" : "⚠",
      ref: selected.drawing,
    },
    {
      key: "pfmea",
      title: "PFMEA",
      detail: selected.pfmea.operation ?? selected.pfmea.evidence ?? "—",
      mark: selected.pfmea.present ? "✓" : "⚠",
      ref: selected.pfmea,
    },
    {
      key: "controlPlan",
      title: "Control Plan",
      detail: [
        selected.controlPlan.operation,
        selected.controlPlan.gauge ? `Gauge ${selected.controlPlan.gauge}` : null,
        selected.controlPlan.specification,
      ]
        .filter(Boolean)
        .join(" · "),
      mark: selected.controlPlan.present ? "✓" : "⚠",
      ref: selected.controlPlan,
    },
    {
      key: "dimensional",
      title: "Dimensional Result",
      detail: selected.dimensional.result ?? selected.dimensional.evidence ?? "—",
      mark: selected.dimensional.present ? "✓" : "⚠",
      ref: selected.dimensional,
    },
    {
      key: "msa",
      title: "MSA",
      detail:
        selected.msa.evidence ??
        (selected.msa.present ? "Present" : "No matching G-104 evidence"),
      mark: selected.msa.present ? "✓" : "⚠",
      className: stepClass(selected.msa, true),
      ref: selected.msa,
    },
    {
      key: "capability",
      title: "Capability",
      detail: selected.capability.result ?? selected.capability.evidence ?? "—",
      mark: selected.capability.present ? "○" : "⚠",
      ref: selected.capability,
    },
  ];

  return (
    <section className="panel">
      <h2>Characteristic Traceability</h2>
      <div className="filters" role="toolbar" aria-label="Characteristics">
        {ppapCase.characteristicTraceability.map((c) => (
          <button
            key={c.id}
            type="button"
            className={selected.id === c.id ? "active" : undefined}
            onClick={() => {
              setSelected(c);
              setOpenStep(null);
            }}
          >
            {c.id}
          </button>
        ))}
      </div>

      <p style={{ marginTop: 0 }}>
        <strong>
          {selected.id} — {selected.name}
        </strong>
      </p>

      <div className="chain">
        {steps.map((step, index) => (
          <div key={step.key}>
            <Step
              title={step.title}
              detail={step.detail}
              mark={step.mark}
              className={step.className}
              onOpen={() => setOpenStep(step.key)}
            />
            {index < steps.length - 1 ? (
              <div className="chain-arrow" aria-hidden="true">
                ↓
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p style={{ marginTop: "0.85rem" }}>
        Status:{" "}
        <span className="badge major">
          {selected.status.replaceAll("_", " ")}
        </span>
      </p>

      {openStep ? (
        <div className="panel" style={{ marginTop: "0.75rem" }}>
          <h3>Evidence detail — {openStep}</h3>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontSize: "0.8rem",
            }}
          >
            {JSON.stringify(
              steps.find((s) => s.key === openStep)?.ref ?? {},
              null,
              2,
            )}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
