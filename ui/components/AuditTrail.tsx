import type { PPAPCase } from "../types.ts";

export function AuditTrail({ ppapCase }: { ppapCase: PPAPCase }) {
  const events = [...ppapCase.auditTrail].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1,
  );

  return (
    <section className="panel">
      <h2>Audit Trail</h2>
      <div className="audit-list">
        {events.map((event) => (
          <article key={event.id} className="audit-item">
            <div>
              <strong>{new Date(event.timestamp).toLocaleString()}</strong> ·{" "}
              {event.actorType}
              {event.actor ? ` (${event.actor})` : ""}
              {event.entityId ? ` · ${event.entityId}` : ""}
            </div>
            <div>{event.action.replaceAll("_", " ")}</div>
            {event.oldValue || event.newValue ? (
              <div className="muted">
                {event.oldValue ?? "—"} → {event.newValue ?? "—"}
              </div>
            ) : null}
            {event.comment ? <div>{event.comment}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
