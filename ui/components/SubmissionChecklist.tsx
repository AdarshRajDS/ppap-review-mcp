import { useMemo, useState } from "react";
import type { DocumentStatus, PPAPCase } from "../types.ts";

type Filter = "ALL" | DocumentStatus | "REVIEW";

export function SubmissionChecklist({ ppapCase }: { ppapCase: PPAPCase }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const rows = useMemo(() => {
    return ppapCase.documents.filter((doc) => {
      if (filter === "ALL") return true;
      if (filter === "REVIEW") {
        return doc.status === "PARTIAL" || doc.status === "MISSING";
      }
      return doc.status === filter;
    });
  }, [ppapCase.documents, filter]);

  const filters: Filter[] = [
    "ALL",
    "PRESENT",
    "PARTIAL",
    "MISSING",
    "REVIEW",
  ];

  return (
    <section className="panel">
      <h2>Submission Checklist</h2>
      <div className="filters" role="toolbar" aria-label="Document filters">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "active" : undefined}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Revision</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.title ?? doc.fileName}</td>
                <td>{doc.type}</td>
                <td>{doc.revision ?? "—"}</td>
                <td>
                  <span
                    className={`badge ${
                      doc.status === "PARTIAL" ? "clarification" : ""
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
