import { ExternalLink } from "lucide-react";
import type { CareerSignal } from "@workspace/api-client-react";

export const KIND_LABEL: Record<string, string> = {
  "labor-market": "Labor market data",
  "employer-survey": "Employer survey",
  policy: "Policy",
  news: "News",
};

export function formatDate(value?: string) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function evidenceAnchor(id: string) {
  return `evidence-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function safeHttps(url: string) {
  try { return new URL(url).protocol === "https:" ? url : null; } catch { return null; }
}

export function EvidenceList({ signals, highlight }: { signals: CareerSignal[]; highlight?: Set<string> }) {
  if (!signals.length) return <div className="trend-state" data-testid="empty-evidence">No evidence signals are in this snapshot.</div>;
  return (
    <ul className="evidence-list" data-testid="list-evidence">
      {signals.map((s) => {
        const href = safeHttps(s.url);
        return (
          <li key={s.id} id={evidenceAnchor(s.id)} className={`evidence-item${highlight?.has(s.id) ? " is-cited" : ""}`} data-testid={`card-evidence-${s.id}`}>
            <div className="evidence-top">
              <span className="evidence-id">{s.id}</span>
              <span className={`evidence-kind kind-${s.kind}`}>{KIND_LABEL[s.kind] ?? s.kind}</span>
              <span className="evidence-weight" title="Weight used by the ranking model (0 to 4)">weight {s.weight}/4</span>
            </div>
            {href ? (
              <a className="coverage-headline" href={href} target="_blank" rel="noopener noreferrer" data-testid={`link-evidence-${s.id}`}>{s.title}<ExternalLink size={11} /></a>
            ) : (
              <span className="coverage-headline">{s.title} <em className="field-hint">(source link unavailable)</em></span>
            )}
            <div className="coverage-meta">
              <span>{s.source}</span><span>·</span>
              <span>Published {formatDate(s.publishedAt)}</span><span>·</span>
              <span>Checked {formatDate(s.fetchedAt)}</span><span>·</span>
              <span>Scope: {s.scope}</span>
            </div>
            {(s.roleIds.length > 0 || s.skills.length > 0) && (
              <div className="skill-chips evidence-chips">
                {s.roleIds.map((r) => <span className="skill-chip known" key={`r-${r}`}>role: {r}</span>)}
                {s.skills.map((k) => <span className="skill-chip" key={`k-${k}`}>{k}</span>)}
              </div>
            )}
            <p className="evidence-limit"><strong>Limitation:</strong> {s.limitation}</p>
          </li>
        );
      })}
    </ul>
  );
}
