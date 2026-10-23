import { ArrowRight } from 'lucide-react';
import type { RankedRole } from '@/lib/career-model';
import { getMatchExplanation } from '@/lib/career-explain';

export default function ExplainPanel({ role, skills }: { role: RankedRole; skills: string[] }) {
  const ex = getMatchExplanation(role, skills);
  const b = ex.breakdown;
  return (
    <div className="why" data-testid="panel-why">
      <div className="insp-label">Why this role</div>
      <div className="why-bars">
        <div><span>Requirement coverage <b data-testid="text-coverage">{ex.covered}/{ex.required} · {ex.coverage}%</b></span><i className="bar cov"><u style={{ width: `${ex.coverage}%` }} /></i></div>
        <div><span>Overall fit heuristic <b data-testid="text-fit-score">{b.score}%</b></span><i className="bar fit"><u style={{ width: `${b.score}%` }} /></i></div>
      </div>
      <p className="why-note">Fit components, in points: {b.baseline.toFixed(1)} base + {b.coveragePoints.toFixed(1)} coverage + {b.transferabilityPoints.toFixed(1)} breadth + {b.resiliencePoints.toFixed(1)} resilience. The total is rounded and capped at 96. {ex.note}</p>
      <ul className="conn" aria-label="Current skill to required skill connections">
        {ex.connections.map((c) => (
          <li key={c.required} className={`conn-row ${c.kind}`} data-testid={`row-connection-${c.kind}`}>
            <span className="conn-from">{c.currentMatches.length ? c.currentMatches.join(', ') : 'No current skill'}</span>
            <span className="conn-line"><ArrowRight size={12} /></span>
            <span className="conn-to">{c.required}<em>{c.kind === 'exact' ? 'Exact match' : c.kind === 'related' ? 'Related text match' : 'Skills gap'}</em></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
