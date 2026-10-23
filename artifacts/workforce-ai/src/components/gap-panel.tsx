import type { RankedRole } from '@/lib/career-model';
import { SDG_LABELS } from '@/lib/career-model';
import { getMatchExplanation } from '@/lib/career-explain';

export function GapPanel({ role, skills }: { role: RankedRole; skills: string[] }) {
  const ex = getMatchExplanation(role, skills);
  return (
    <section className="jr-card" id="panel-skills-gap" data-testid="panel-skills-gap">
      <h2>Skills gap</h2>
      <p className="jr-hint" style={{ margin: '4px 0 12px' }}>{ex.covered} of {ex.required} requirements covered</p>
      <ul className="jr-gaps">
        {ex.connections.filter((c) => c.kind === 'gap').map((c) => <li key={c.required}>{c.required}</li>)}
      </ul>
      {!role.missing.length && <p className="jr-hint">No missing skills in the listed requirements.</p>}
      <details className="jr-why" style={{ marginTop: 12 }}><summary>How is fit estimated?</summary>
        <p>Fit {ex.breakdown.score}%: {ex.breakdown.baseline.toFixed(1)} base + {ex.breakdown.coveragePoints.toFixed(1)} coverage + {ex.breakdown.transferabilityPoints.toFixed(1)} breadth + {ex.breakdown.resiliencePoints.toFixed(1)} resilience (rounded, capped at 96). {ex.note}</p>
        {ex.connections.filter((c) => c.kind !== 'gap').map((c) => <p key={c.required}>{c.currentMatches.join(', ')} → {c.required} ({c.kind} match)</p>)}
      </details>
    </section>
  );
}

export function SdgPanel({ role }: { role: RankedRole }) {
  return (
    <section className="jr-card" id="panel-sdgs" data-testid="panel-sdgs" style={{ marginTop: 16 }}>
      <h2>UN SDGs</h2>
      {role.sdgs.length ? <ul className="jr-sdg" style={{ marginTop: 12 }}>{role.sdgs.map((s) => <li key={s}><b>{s}</b>{SDG_LABELS[s] ?? 'UN Sustainable Development Goal'}</li>)}</ul>
        : <p className="jr-hint" style={{ marginTop: 8 }}>No SDGs listed for this role.</p>}
    </section>
  );
}
