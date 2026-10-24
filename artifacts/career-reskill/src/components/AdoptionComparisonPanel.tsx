import type { PathwayAnalysis } from "@workspace/api-client-react";
import { SCENARIO_COPY, buildRoleComparisons, changeTone, describeChange, ordinal, scenarioLabel, type ScenarioPlacement } from "../lib/adoption-comparison";

function slug(s: string) {
  return s.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}

function Placement({ p, label, selected }: { p: ScenarioPlacement; label: string; selected: boolean }) {
  return (
    <div className={`cmp-cell${selected ? " is-selected" : ""}`}>
      <div className="cmp-cell-label">{label}{selected && <span className="cmp-viewing"> (viewing)</span>}</div>
      {p ? (
        <div className="cmp-cell-values">
          <span className="cmp-rank">{ordinal(p.rank)} choice</span>
          <span className="cmp-score">Fit score: {p.score}/100</span>
        </div>
      ) : (
        <div className="cmp-cell-values">
          <span className="cmp-outside">Outside the top 3</span>
          <span className="cmp-outside-note">Not among the three best-fit roles here, so no score is shown.</span>
        </div>
      )}
    </div>
  );
}

export function AdoptionComparisonPanel({ analysis, selectedId, onSelect }: { analysis: PathwayAnalysis; selectedId: string; onSelect: (id: string) => void }) {
  const comparisons = analysis.comparisons ?? [];
  const rows = buildRoleComparisons(analysis);
  const hasBoth = comparisons.some((c) => c.id === "moderate") && comparisons.some((c) => c.id === "fast");

  return (
    <section className="section-card fade-in delay-1 cmp-panel" data-testid="card-adoption-comparison" aria-labelledby="cmp-heading">
      <h2 id="cmp-heading" className="card-title">How could your career options change?</h2>
      <p className="card-description cmp-intro">Two hypothetical futures, the same profile. Choose one to show its recommended roles below.</p>

      <p className="cmp-warning" role="note" data-testid="text-comparison-warning">
        <strong>These are hypothetical scenarios, not forecasts.</strong> Fit scores are relative model estimates from 1 to 100. They are not job-offer probabilities or measured hiring demand.
      </p>

      {comparisons.length > 0 && (
        <div className="cmp-choices" role="group" aria-label="Adoption scenario shown in role cards">
          {comparisons.map((c) => {
            const on = c.id === selectedId;
            return (
              <button key={c.id} type="button" className="cmp-choice" aria-pressed={on} onClick={() => onSelect(c.id)} data-testid={`button-comparison-${c.id}`}>
                <span className="cmp-choice-top">
                  <span className="cmp-radio" aria-hidden="true" />
                  <span className="cmp-choice-name">{scenarioLabel(c.id, c.name)}</span>
                  {on && <span className="cmp-choice-badge">Showing below</span>}
                </span>
                <span className="cmp-choice-blurb">{SCENARIO_COPY[c.id]?.blurb ?? c.assumptions}</span>
              </button>
            );
          })}
        </div>
      )}

      {comparisons.length > 0 && (
        <ul className="cmp-leaders" data-testid="list-comparison-leaders">
          {comparisons.map((c) => {
            const lead = c.scenarios?.[0];
            return (
              <li key={c.id} data-testid={`text-leading-role-${c.id}`}>
                <span className="cmp-leaders-label">{scenarioLabel(c.id, c.name)}</span>{" "}
                {lead ? <>leading role: <strong>{lead.roleTitle}</strong> (fit score {lead.matchScore}/100)</> : "no roles were ranked."}
              </li>
            );
          })}
        </ul>
      )}

      {rows.length === 0 ? (
        <p className="cmp-empty" data-testid="empty-comparison-roles">No roles are available to compare in this saved pathway.</p>
      ) : (
        <ul className="cmp-rows" aria-label="Role comparison, gradual versus faster adoption">
          {rows.map((row) => {
            const tone = changeTone(row);
            return (
              <li key={row.roleTitle} className="cmp-row" data-testid={`row-comparison-${slug(row.roleTitle)}`}>
                <h3 className="cmp-role">{row.roleTitle}</h3>
                <Placement p={row.gradual} label="Gradual adoption" selected={selectedId === "moderate"} />
                <Placement p={row.faster} label="Faster adoption" selected={selectedId === "fast"} />
                <p className={`cmp-change cmp-${tone}`} data-testid={`text-comparison-change-${slug(row.roleTitle)}`}>
                  <span className="cmp-change-label">Change</span>
                  {hasBoth ? describeChange(row) : "Only one scenario is available."}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="cmp-footnote">Order shows how roles rank within each scenario. Score changes always compare faster adoption against gradual adoption.</p>

      <details className="cmp-details" data-testid="text-comparison-disclosure">
        <summary data-testid="button-comparison-how">How this works</summary>
        <div className="cmp-details-grid">
          {comparisons.map((c) => <div key={c.id}><h4>{scenarioLabel(c.id, c.name)} assumptions</h4><p>{c.assumptions}</p></div>)}
          <div><h4>Model and scoring</h4><p>{analysis.model}. Scores are relative fit estimates on a 1 to 100 scale, not probabilities of getting a job. Tied scores keep the order the model saved.</p></div>
          <div><h4>Limitations and your control</h4><p>{analysis.limitations} You decide which path to pursue; treat these rankings as one input alongside your own judgment and local advice.</p></div>
        </div>
      </details>
    </section>
  );
}
