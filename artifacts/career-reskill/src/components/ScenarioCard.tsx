import { Check, Clock3, ExternalLink, Globe2, GraduationCap } from "lucide-react";
import type { PathwayScenario } from "@workspace/api-client-react";
import { getLearningResourceLink } from "../lib/pathway-resource-links";

export function ScenarioCard({ scenario, index }: { scenario: PathwayScenario; index: number }) {
  return (
    <article className={`section-card role-card fade-in delay-${Math.min(index + 1, 2)}`} data-testid={`card-scenario-${index}`}>
      <div className="role-head">
        <h3 className="role-title" data-testid={`text-scenario-title-${index}`}>{scenario.roleTitle}</h3>
        <span className="match-badge" data-testid={`status-scenario-match-${index}`}><Check size={11} /> {scenario.matchScore}% match</span>
      </div>
      <p className="role-description" data-testid={`text-scenario-reason-${index}`}>{scenario.explainableReason}</p>
      <div className="scenario-sdg" data-testid={`text-scenario-sdg-${index}`}><Globe2 size={13} />{scenario.unSdgTag}</div>
      <div className="gap-label">Skills to build</div>
      {scenario.skillsGap.length ? (
        <div className="skill-chips">
          {scenario.skillsGap.map((skill) => <span className="skill-chip missing" key={skill}>{skill}</span>)}
        </div>
      ) : (
        <p className="role-description">Your current skills already cover this pathway’s listed gaps.</p>
      )}
      <details className="learning-path" data-testid={`details-scenario-steps-${index}`}>
        <summary><span><GraduationCap size={14} style={{ verticalAlign: "middle", marginRight: 7, color: "#347a70" }} />Reskilling pathway</span><span className="field-hint">3 steps</span></summary>
        <ol>
          {scenario.reskillingPathway.map((step, stepIndex) => {
            const resource = getLearningResourceLink(step.step, step.resourceLink);
            return (
              <li className="scenario-step" key={`${step.step}-${stepIndex}`} data-testid={`text-scenario-step-${index}-${stepIndex}`}>
                <span className="scenario-step-copy">
                  <span>{step.step}</span>
                  <a
                    className="scenario-step-resource"
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${resource.label} for ${step.step}`}
                    data-testid={`link-scenario-step-resource-${index}-${stepIndex}`}
                  >
                    {resource.label}<ExternalLink size={11} aria-hidden="true" />
                  </a>
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
