import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useCallback, useMemo, useState } from "react";
import { AuditTrail } from "./components/AuditTrail.tsx";
import { CaseOverview } from "./components/CaseOverview.tsx";
import { CharacteristicTraceabilityView } from "./components/CharacteristicTraceability.tsx";
import { FindingDetail } from "./components/FindingDetail.tsx";
import {
  FindingsQueue,
  type FindingFilter,
} from "./components/FindingsQueue.tsx";
import { Header } from "./components/Header.tsx";
import { ProcessTraceabilityView } from "./components/ProcessTraceability.tsx";
import { ReviewSummaryView } from "./components/ReviewSummary.tsx";
import { SubmissionChecklist } from "./components/SubmissionChecklist.tsx";
import {
  callGetReviewSummary,
  callSetFindingDecision,
  notifyHostDecision,
} from "./mcp-client.ts";
import type { PPAPCase, ReviewSummary, SqeDecision } from "./types.ts";

export type NavId =
  | "overview"
  | "submission"
  | "findings"
  | "process"
  | "characteristics"
  | "summary"
  | "audit";

const NAV: { id: NavId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "submission", label: "Submission" },
  { id: "findings", label: "Findings" },
  { id: "process", label: "Process Traceability" },
  { id: "characteristics", label: "Characteristics" },
  { id: "summary", label: "Review Summary" },
  { id: "audit", label: "Audit Trail" },
];

export function App({
  app,
  initialCase,
  initialSummary,
  mockMode = false,
}: {
  app: McpApp | null;
  initialCase: PPAPCase;
  initialSummary?: ReviewSummary;
  mockMode?: boolean;
}) {
  const [ppapCase, setPpapCase] = useState(initialCase);
  const [summary, setSummary] = useState<ReviewSummary | undefined>(
    initialSummary,
  );
  const [nav, setNav] = useState<NavId>("findings");
  const [selectedFindingId, setSelectedFindingId] = useState(
    initialCase.findings[0]?.id ?? "",
  );
  const [findingFilter, setFindingFilter] = useState<FindingFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFinding = useMemo(
    () => ppapCase.findings.find((f) => f.id === selectedFindingId),
    [ppapCase.findings, selectedFindingId],
  );

  const handleSaveDecision = useCallback(
    async (decision: SqeDecision, comment: string) => {
      if (!selectedFinding) return;
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        if (!app) {
          // Mock mode: apply locally only
          setPpapCase((current) => {
            const findings = current.findings.map((f) =>
              f.id === selectedFinding.id
                ? {
                    ...f,
                    sqeDecision: decision,
                    status:
                      decision === "SUPPLIER_CLARIFICATION"
                        ? ("SUPPLIER_CLARIFICATION" as const)
                        : decision === "FALSE_POSITIVE"
                          ? ("FALSE_POSITIVE" as const)
                          : decision === "INTERNAL_REVIEW"
                            ? ("INTERNAL_REVIEW" as const)
                            : decision === "NOT_APPLICABLE"
                              ? ("NOT_APPLICABLE" as const)
                              : decision === "RESOLVED"
                                ? ("RESOLVED" as const)
                                : ("SQE_CONFIRMED" as const),
                    comments: comment.trim()
                      ? [
                          ...f.comments,
                          {
                            id: `CMT-MOCK-${Date.now()}`,
                            text: comment.trim(),
                            reviewer: "SQE",
                            createdAt: new Date().toISOString(),
                          },
                        ]
                      : f.comments,
                    updatedAt: new Date().toISOString(),
                  }
                : f,
            );
            return {
              ...current,
              findings,
              updatedAt: new Date().toISOString(),
              auditTrail: [
                ...current.auditTrail,
                {
                  id: `AUD-MOCK-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: "FINDING_DECISION",
                  entityType: "FINDING",
                  entityId: selectedFinding.id,
                  actorType: "SQE" as const,
                  actor: "SQE",
                  oldValue: selectedFinding.sqeDecision ?? selectedFinding.status,
                  newValue: decision,
                  comment: comment.trim() || undefined,
                },
              ],
            };
          });
          return;
        }

        const result = await callSetFindingDecision(app, {
          caseId: ppapCase.caseId,
          findingId: selectedFinding.id,
          decision,
          reviewer: "SQE",
          comment: comment.trim() || undefined,
        });

        setPpapCase((current) => ({
          ...current,
          findings: current.findings.map((f) =>
            f.id === result.findingId ? result.updatedFinding : f,
          ),
          updatedAt: new Date().toISOString(),
          auditTrail: [
            ...current.auditTrail,
            {
              id: `AUD-UI-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: "FINDING_DECISION",
              entityType: "FINDING",
              entityId: result.findingId,
              actorType: "SQE",
              actor: "SQE",
              oldValue: selectedFinding.sqeDecision ?? selectedFinding.status,
              newValue: decision,
              comment: comment.trim() || undefined,
            },
          ],
        }));
        setSummary(result.reviewSummary);
        await notifyHostDecision(app, {
          caseId: ppapCase.caseId,
          findingId: selectedFinding.id,
          decision,
          comment: comment.trim() || undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save decision");
      } finally {
        setBusy(false);
      }
    },
    [app, busy, ppapCase.caseId, selectedFinding],
  );

  const handleRefreshSummary = useCallback(async () => {
    setRefreshBusy(true);
    setError(null);
    try {
      if (!app) {
        setError("Review summary refresh requires an MCP host connection.");
        return;
      }
      const next = await callGetReviewSummary(app, ppapCase.caseId);
      setSummary(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh summary");
    } finally {
      setRefreshBusy(false);
    }
  }, [app, ppapCase.caseId]);

  return (
    <div className="app-shell">
      <Header ppapCase={ppapCase} mockMode={mockMode} />
      <div className="nav-mobile">
        <label>
          <span className="visually-hidden">Section</span>
          <select
            value={nav}
            onChange={(e) => setNav(e.target.value as NavId)}
            aria-label="Workbench section"
          >
            {NAV.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="layout">
        <nav className="nav" aria-label="Workbench navigation">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={nav === item.id ? "active" : undefined}
              onClick={() => setNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main className="main">
          {error && nav !== "findings" ? (
            <div className="error-banner">{error}</div>
          ) : null}

          {nav === "overview" ? <CaseOverview ppapCase={ppapCase} /> : null}
          {nav === "submission" ? (
            <SubmissionChecklist ppapCase={ppapCase} />
          ) : null}
          {nav === "findings" ? (
            <div className="findings-layout">
              <FindingsQueue
                findings={ppapCase.findings}
                selectedId={selectedFindingId}
                filter={findingFilter}
                onFilterChange={setFindingFilter}
                onSelect={setSelectedFindingId}
              />
              {selectedFinding ? (
                <FindingDetail
                  key={selectedFinding.id}
                  finding={selectedFinding}
                  busy={busy}
                  error={error}
                  onSave={handleSaveDecision}
                />
              ) : (
                <section className="panel">
                  <p className="muted">Select a finding to review.</p>
                </section>
              )}
            </div>
          ) : null}
          {nav === "process" ? (
            <ProcessTraceabilityView ppapCase={ppapCase} />
          ) : null}
          {nav === "characteristics" ? (
            <CharacteristicTraceabilityView ppapCase={ppapCase} />
          ) : null}
          {nav === "summary" ? (
            summary ? (
              <ReviewSummaryView
                summary={summary}
                busy={refreshBusy}
                onRefresh={handleRefreshSummary}
              />
            ) : (
              <section className="panel">
                <h2>Review Summary</h2>
                <p className="muted">No summary available yet.</p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleRefreshSummary}
                >
                  Refresh Review Summary
                </button>
              </section>
            )
          ) : null}
          {nav === "audit" ? <AuditTrail ppapCase={ppapCase} /> : null}
        </main>
      </div>
    </div>
  );
}
