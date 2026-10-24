import { Check, Clock3, ExternalLink, Globe2, GraduationCap, Link2Off } from "lucide-react";
import type { CareerSignal, PathwayScenario } from "@workspace/api-client-react";
import { getLearningResourceLink } from "../lib/pathway-resource-links";
import { evidenceAnchor, formatDate } from "./EvidenceList";

export function ScenarioCard({
  scenario,
  index,
  rank,
  evidence,
  otherScore,
  otherLabel,
}: {
  scenario: PathwayScenario;
  index: number;
  rank?: number;
  evidence?: Map<string, CareerSignal>;
  otherScore?: number;
  otherLabel?: string;
}) {
  const delta = otherScore === undefined ? undefined : scenario.matchScore - otherScore;
  return (
    <article className={`section-card role-card fade-in delay-${Math.min(index + 1, 2)}`} data-testid={`card-scenario-${index}`}>
      <div className="role-head">
        <h3 className="role-title" data-testid={`text-scenario-title-${index}`}>{rank ? <span className="rank-num">#{rank}</span> : null}{scenario.roleTitle}</h3>
        <span className="match-badge" data-testid={`status-scenario-match-${index}`}><Check size={11} /> {scenario.matchScore} score</span>
      </div>
      {delta !== undefined && (
        <div className="field-hint" data-testid={`text-scenario-delta-${index}`}>
          {delta === 0 ? `Same score under ${otherLabel}` : `${delta > 0 ? "+" : ""}${delta} vs ${otherLabel}`}
        </div>
      )}
      <p className="role-description" data-testid={`text-scenario-reason-${index}`}>{scenario.explainableReason}</p>
      {scenario.scoreBasis && <p className="role-description" data-testid={`text-scenario-basis-${index}`}><strong>Score basis:</strong> {scenario.scoreBasis}</p>}
      {scenario.paceEstimate && <div className="metric-tag" data-testid={`text-scenario-pace-${index}`}><Clock3 size={11} /> Estimated pace: {scenario.paceEstimate}</div>}
      <div className="scenario-sdg" data-testid={`text-scenario-sdg-${index}`}><Globe2 size={13} />{scenario.unSdgTag}</div>
      {scenario.matchedSkills && scenario.matchedSkills.length > 0 && (
        <>
          <div className="gap-label">Skills you already bring</div>
          <div className="skill-chips" style={{ marginBottom: 12 }}>
            {scenario.matchedSkills.map((skill) => <span className="skill-chip known" key={skill}>{skill}</span>)}
          </div>
        </>
      )}
      <div className="gap-label">Skills to build</div>
      {scenario.skillsGap.length ? (
        <div className="skill-chips">
          {scenario.skillsGap.map((skill) => <span className="skill-chip missing" key={skill}>{skill}</span>)}
        </div>
      ) : (
        <p className="role-description">Your current skills already cover this pathway’s listed gaps.</p>
      )}
      {scenario.evidenceIds && scenario.evidenceIds.length > 0 && (
        <div className="evidence-refs" data-testid={`list-scenario-evidence-${index}`}>
          <div className="gap-label">Evidence used</div>
          {scenario.evidenceIds.map((id) => {
            const sig = evidence?.get(id);
            return sig ? (
              <a key={id} href={`#${evidenceAnchor(id)}`} className="evidence-ref" data-testid={`link-scenario-evidence-${index}-${id}`}>{sig.source}: {sig.title}</a>
            ) : (
              <span key={id} className="evidence-ref missing">{id} (not in this snapshot)</span>
            );
          })}
        </div>
      )}
      <details className="learning-path" data-testid={`details-scenario-steps-${index}`}>
        <summary><span><GraduationCap size={14} style={{ verticalAlign: "middle", marginRight: 7, color: "#347a70" }} />Reskilling pathway</span><span className="field-hint">3 steps</span></summary>
        <ol>
          {scenario.reskillingPathway.map((step, stepIndex) => {
            const resource = getLearningResourceLink(step.resourceLink, step.resourceTitle);
            return (
              <li className="scenario-step" key={`${step.step}-${stepIndex}`} data-testid={`text-scenario-step-${index}-${stepIndex}`}>
                <span className="scenario-step-copy">
                  <span>{step.step}</span>
                  {resource.available ? (
                    <a className="scenario-step-resource" href={resource.href} target="_blank" rel="noopener noreferrer" aria-label={`${resource.label} for ${step.step}`} data-testid={`link-scenario-step-resource-${index}-${stepIndex}`}>
                      {resource.label}<ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="scenario-step-unavailable" data-testid={`status-scenario-step-resource-${index}-${stepIndex}`}><Link2Off size={11} /> {resource.reason}</span>
                  )}
                  {step.cost && <span className="field-hint">{step.cost}</span>}
                  {step.checkedAt && <span className="field-hint">checked {formatDate(step.checkedAt)}</span>}
                </span>
                <span className="scenario-step-hours"><Clock3 size={11} /> {step.estimatedHours} hours</span>
              </li>
            );
          })}
        </ol>
      </details>
    </article>
  );
}
