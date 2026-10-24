import type { PathwayAnalysis } from "@workspace/api-client-react";

export function AdoptionComparisonPanel({ analysis, selectedId, onSelect }: { analysis: PathwayAnalysis; selectedId: string; onSelect: (id: string) => void }) {
  const [a, b] = analysis.comparisons;
  const roles = Array.from(new Set(analysis.comparisons.flatMap((c) => c.scenarios.map((s) => s.roleTitle))));
  const lookup = (cIdx: number, role: string) => {
    const list = analysis.comparisons[cIdx]?.scenarios ?? [];
    const i = list.findIndex((s) => s.roleTitle === role);
    return i < 0 ? null : { rank: i + 1, score: list[i].matchScore };
  };
  return (
    <section className="section-card fade-in delay-1" style={{ padding: 20, marginBottom: 18 }} data-testid="card-adoption-comparison">
      <div className="card-head">
        <div><h2 className="card-title">Compare adoption scenarios</h2><p className="card-description">Same profile, two assumptions about how fast AI and automation are adopted. Pick one to drive the role cards below.</p></div>
        <div className="compare-tabs" role="group" aria-label="Adoption scenario">
          {analysis.comparisons.map((c) => (
            <button key={c.id} type="button" className="compare-tab" aria-pressed={c.id === selectedId} onClick={() => onSelect(c.id)} data-testid={`button-comparison-${c.id}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div className="table-scroll">
        <table className="compare-table" data-testid="table-comparison">
          <thead><tr><th>Role</th><th className={a?.id === selectedId ? "sel" : ""}>{a?.name} rank / score</th><th className={b?.id === selectedId ? "sel" : ""}>{b?.name} rank / score</th><th>Difference</th></tr></thead>
          <tbody>
            {roles.map((role) => {
              const x = lookup(0, role); const y = lookup(1, role);
              const diff = x && y ? y.score - x.score : null;
              return (
                <tr key={role} data-testid={`row-comparison-${role}`}>
                  <td>{role}</td>
                  <td className={`num ${a?.id === selectedId ? "sel" : ""}`}>{x ? `#${x.rank} · ${x.score}` : "Not ranked"}</td>
                  <td className={`num ${b?.id === selectedId ? "sel" : ""}`}>{y ? `#${y.rank} · ${y.score}` : "Not ranked"}</td>
                  <td className="num">{diff === null ? "n/a" : `${diff > 0 ? "+" : ""}${diff}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="disclosure-grid" data-testid="text-comparison-disclosure">
        {analysis.comparisons.map((c) => <div key={c.id}><h4>{c.name} assumptions</h4><p>{c.assumptions}</p></div>)}
        <div><h4>Model</h4><p>{analysis.model}. Scores are relative fit estimates on a 1 to 100 scale, not probabilities of getting a job.</p></div>
        <div><h4>Limitations and your control</h4><p>{analysis.limitations} You decide which path to pursue; treat these rankings as one input alongside your own judgment and local advice.</p></div>
      </div>
    </section>
  );
}
