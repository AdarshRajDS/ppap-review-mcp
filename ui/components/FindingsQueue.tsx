import type { FindingSeverity, PPAPFinding } from "../types.ts";

function severityClass(severity: FindingSeverity): string {
  if (severity === "CRITICAL_REVIEW") return "critical";
  if (severity === "MAJOR_REVIEW") return "major";
  return "clarification";
}

function severityLabel(severity: FindingSeverity): string {
  return severity.replaceAll("_", " ");
}

export type FindingFilter =
  | "ALL"
  | "CRITICAL"
  | "MAJOR"
  | "CLARIFICATION"
  | "UNRESOLVED"
  | "SUPPLIER_CLARIFICATION"
  | "RESOLVED";

export function FindingsQueue({
  findings,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
}: {
  findings: PPAPFinding[];
  selectedId?: string;
  filter: FindingFilter;
  onFilterChange: (filter: FindingFilter) => void;
  onSelect: (id: string) => void;
}) {
  const filters: FindingFilter[] = [
    "ALL",
    "CRITICAL",
    "MAJOR",
    "CLARIFICATION",
    "UNRESOLVED",
    "SUPPLIER_CLARIFICATION",
    "RESOLVED",
  ];

  const filtered = findings.filter((f) => {
    switch (filter) {
      case "CRITICAL":
        return f.preliminarySeverity === "CRITICAL_REVIEW";
      case "MAJOR":
        return f.preliminarySeverity === "MAJOR_REVIEW";
      case "CLARIFICATION":
        return f.preliminarySeverity === "CLARIFICATION";
      case "UNRESOLVED":
        return !f.sqeDecision;
      case "SUPPLIER_CLARIFICATION":
        return (
          f.sqeDecision === "SUPPLIER_CLARIFICATION" ||
          f.status === "SUPPLIER_CLARIFICATION"
        );
      case "RESOLVED":
        return f.sqeDecision === "RESOLVED" || f.status === "RESOLVED";
      default:
        return true;
    }
  });

  return (
    <div>
      <div className="filters" role="toolbar" aria-label="Finding filters">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "active" : undefined}
            onClick={() => onFilterChange(f)}
          >
            {f.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      <div className="finding-list" role="listbox" aria-label="Findings">
        {filtered.map((finding) => (
          <button
            key={finding.id}
            type="button"
            className={`finding-item ${selectedId === finding.id ? "active" : ""}`}
            onClick={() => onSelect(finding.id)}
            aria-selected={selectedId === finding.id}
          >
            <div className="id">{finding.id}</div>
            <div className="title">{finding.title}</div>
            <span className={`badge ${severityClass(finding.preliminarySeverity)}`}>
              {severityLabel(finding.preliminarySeverity)}
            </span>
            {finding.sqeDecision ? (
              <div className="muted" style={{ marginTop: "0.35rem" }}>
                Decision: {finding.sqeDecision.replaceAll("_", " ")}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
