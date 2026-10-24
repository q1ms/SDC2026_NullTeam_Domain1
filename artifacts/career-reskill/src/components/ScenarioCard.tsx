import { useState } from "react";
import { BookOpen, CalendarClock, CalendarDays, Check, ChevronDown, Clock3, ExternalLink, Globe2, GraduationCap, Info, Link2Off } from "lucide-react";
import type { CareerSignal, PathwayScenario } from "@workspace/api-client-react";
import { getPivotInterests } from "../lib/career-pivot-copy";
import { getLearningResourceLink } from "../lib/pathway-resource-links";
import { evidenceAnchor, formatDate } from "./EvidenceList";
import { useLanguage } from "../i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function ScenarioCard({
  scenario,
  index,
  rank,
  evidence,
  profileInterests,
  weeklyHours = 4,
  otherScore,
  otherLabel,
}: {
  scenario: PathwayScenario;
  index: number;
  rank?: number;
  evidence?: Map<string, CareerSignal>;
  profileInterests?: string[];
  weeklyHours?: number;
  otherScore?: number;
  otherLabel?: string;
}) {
  const { t } = useLanguage();
  const [acquiredSkills, setAcquiredSkills] = useState<string[]>([]);
  const delta = otherScore === undefined ? undefined : scenario.matchScore - otherScore;
  const projectedScore = Math.min(99, scenario.matchScore + acquiredSkills.length * 5);
  const projectedGain = projectedScore - scenario.matchScore;
  const totalEffort = scenario.reskillingPathway.reduce((total, step) => total + step.estimatedHours, 0);
  const timelineWeeks = weeklyHours > 0 ? Math.ceil(totalEffort / weeklyHours) : 0;
  const pivotInterests = getPivotInterests(profileInterests, scenario.explainableReason);
  const pivotIntro = pivotInterests.length === 1
    ? t("pathway.pivotOne").replace("{interest}", pivotInterests[0])
    : pivotInterests.length > 1
      ? t("pathway.pivotMany").replace("{interest}", pivotInterests.join(" and "))
      : t("pathway.pivotFallback");
  const addAcquiredSkill = (skill: string) => {
    setAcquiredSkills((current) => current.includes(skill) ? current : [...current, skill]);
  };
  return (
    <article className={`section-card role-card fade-in delay-${Math.min(index + 1, 2)}`} style={{ order: index }} data-testid={`card-scenario-${index}`}>
      <div className="role-head">
        <h3 className="role-title" data-testid={`text-scenario-title-${index}`}>{rank ? <span className="rank-num">#{rank}</span> : null}{scenario.roleTitle}</h3>
        {scenario.scoreBasis ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="match-badge match-badge-help"
                  data-testid={`status-scenario-match-${index}`}
                  aria-label={acquiredSkills.length
                    ? `${t("pathway.fitScore")} ${scenario.matchScore}; ${t("pathway.projectedScore")} ${projectedScore} / 100. ${t("pathway.whyThisScore")}`
                    : `${t("pathway.fitScore")} ${scenario.matchScore} / 100. ${t("pathway.whyThisScore")}`}
                >
                  <Check size={11} aria-hidden="true" /> {scenario.matchScore}
                  {acquiredSkills.length > 0 ? (
                    <>
                      <span aria-hidden="true">→</span>
                      <strong>{projectedScore}</strong> {t("pathway.projectedScore")}
                      <span className="projected-score-note" key={projectedGain}>
                        {projectedGain > 0
                          ? t("pathway.projectedGain").replace("{points}", String(projectedGain))
                          : t("pathway.scoreCapped")}
                      </span>
                    </>
                  ) : (
                    <>{t("pathway.fitScore")}</>
                  )}
                  <Info size={12} aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="score-basis-tooltip" data-testid={`tooltip-scenario-basis-${index}`}>
                <strong>{t("pathway.whyThisScore")}</strong>
                <span>{scenario.scoreBasis}</span>
                {acquiredSkills.length > 0 && (
                  <span>Completed skills add 5 points each, capped at 99. Current projection: {projectedScore}/100.</span>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="match-badge" data-testid={`status-scenario-match-${index}`}>
            <Check size={11} aria-hidden="true" /> {scenario.matchScore}
            {acquiredSkills.length > 0 ? (
              <>
                <span aria-hidden="true">→</span>
                <strong>{projectedScore}</strong> {t("pathway.projectedScore")}
                <span className="projected-score-note" key={projectedGain}>
                  {projectedGain > 0
                    ? t("pathway.projectedGain").replace("{points}", String(projectedGain))
                    : t("pathway.scoreCapped")}
                </span>
              </>
            ) : (
              <>{t("pathway.fitScore")}</>
            )}
          </span>
        )}
      </div>
      {delta !== undefined && (
        <div className="field-hint" data-testid={`text-scenario-delta-${index}`}>
          {delta === 0 ? `Same score under ${otherLabel}` : `${delta > 0 ? "+" : ""}${delta} vs ${otherLabel}`}
        </div>
      )}
      <p className="role-description" data-testid={`text-scenario-reason-${index}`}>{pivotIntro}</p>
      <div className="pace-summary" data-testid={`text-scenario-pace-${index}`}>
        <div className="pace-metric">
          <Clock3 size={14} aria-hidden="true" />
          <span>{t("pathway.totalEffort")}</span>
          <strong>{totalEffort} {t("pathway.hours")}</strong>
        </div>
        <div className="pace-metric">
          <CalendarClock size={14} aria-hidden="true" />
          <span>{t("pathway.yourPace")}</span>
          <strong>{weeklyHours} {t("pathway.hoursPerWeek")}</strong>
        </div>
        <div className="pace-metric">
          <CalendarDays size={14} aria-hidden="true" />
          <span>{t("pathway.timeline")}</span>
          <strong>{t("pathway.weeks").replace("{count}", String(timelineWeeks))}</strong>
        </div>
        <p className="pace-disclaimer">{t("pathway.paceDisclaimer")}</p>
      </div>
      <div className="scenario-sdg" data-testid={`text-scenario-sdg-${index}`}><Globe2 size={13} />{scenario.unSdgTag}</div>
      {scenario.matchedSkills && scenario.matchedSkills.length > 0 && (
        <>
          <div className="gap-label">{t("pathway.skillsYouBring")}</div>
          <div className="skill-chips" style={{ marginBottom: 12 }}>
            {scenario.matchedSkills.map((skill) => <span className="skill-chip known" key={skill}>{skill}</span>)}
          </div>
        </>
      )}
      <div className="gap-label">{t("pathway.skillsToBuild")}</div>
      {scenario.skillsGap.length ? (
        <div className="skill-chips">
          {scenario.skillsGap.map((skill, skillIndex) => {
            const isChecked = acquiredSkills.includes(skill);
            return (
              <span
                className={`skill-chip missing skill-chip-state${isChecked ? " is-checked" : ""}`}
                key={`${skill}-${skillIndex}`}
                data-testid={`label-scenario-skill-${index}-${skillIndex}`}
              >
                {isChecked && <Check size={11} aria-hidden="true" />}
                <span>{skill}</span>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="role-description">{t("pathway.noSkillsGap")}</p>
      )}
      {scenario.evidenceIds && scenario.evidenceIds.length > 0 && (
        <details className="learning-path scenario-accordion" data-testid={`details-scenario-evidence-${index}`}>
          <summary>
            <span className="scenario-accordion-title"><BookOpen size={14} aria-hidden="true" />{t("pathway.evidenceUsed")}</span>
            <span className="scenario-accordion-meta">{t("pathway.sourceCount").replace("{count}", String(scenario.evidenceIds.length))}</span>
            <ChevronDown size={14} className="scenario-accordion-chevron" aria-hidden="true" />
          </summary>
          <div className="evidence-refs" data-testid={`list-scenario-evidence-${index}`}>
            {scenario.evidenceIds.map((id) => {
              const sig = evidence?.get(id);
              return sig ? (
                <a key={id} href={`#${evidenceAnchor(id)}`} className="evidence-ref" data-testid={`link-scenario-evidence-${index}-${id}`}>{sig.source}: {sig.title}</a>
              ) : (
                <span key={id} className="evidence-ref missing">{id} (not in this snapshot)</span>
              );
            })}
          </div>
        </details>
      )}
      <details className="learning-path" data-testid={`details-scenario-steps-${index}`}>
        <summary>
          <span className="scenario-accordion-title"><GraduationCap size={14} aria-hidden="true" />{t("pathway.reskillingPathway")}</span>
          <span className="scenario-accordion-meta">{t("pathway.stepsCount").replace("{count}", String(scenario.reskillingPathway.length))}</span>
          <ChevronDown size={14} className="scenario-accordion-chevron" aria-hidden="true" />
        </summary>
        <ol>
          {scenario.reskillingPathway.map((step, stepIndex) => {
            const resource = getLearningResourceLink(step.resourceLink, step.resourceTitle);
            const stepSkill = step.teachesSkill ?? getStepSkill(step.step, scenario.skillsGap, stepIndex);
            const stepComplete = stepSkill ? acquiredSkills.includes(stepSkill) : false;
            return (
              <li className="scenario-step" key={`${step.step}-${stepIndex}`} data-testid={`text-scenario-step-${index}-${stepIndex}`}>
                <span className="scenario-step-copy">
                  <span>{step.step}</span>
                  {stepSkill && <span className="scenario-step-teaches">{t("pathway.teachesSkill")}: <strong>{stepSkill}</strong></span>}
                  {resource.available ? (
                    <a className="scenario-step-resource" href={resource.href} target="_blank" rel="noopener noreferrer" aria-label={`${resource.label} for ${step.step}`} data-testid={`link-scenario-step-resource-${index}-${stepIndex}`}>
                      {resource.label}<ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="scenario-step-unavailable" data-testid={`status-scenario-step-resource-${index}-${stepIndex}`}><Link2Off size={11} /> {resource.reason}</span>
                  )}
                  {step.cost && <span className="field-hint">{step.cost}</span>}
                  {step.checkedAt && <span className="field-hint">checked {formatDate(step.checkedAt)}</span>}
                  {stepSkill && (
                    <button
                      className={`scenario-step-complete${stepComplete ? " is-complete" : ""}`}
                      type="button"
                      onClick={() => addAcquiredSkill(stepSkill)}
                      disabled={stepComplete}
                      aria-pressed={stepComplete}
                      aria-label={`${stepComplete ? t("pathway.stepComplete") : t("pathway.markStepComplete")}: ${stepSkill}`}
                      data-testid={`button-scenario-step-complete-${index}-${stepIndex}`}
                    >
                      <Check size={11} aria-hidden="true" />
                      {stepComplete ? t("pathway.stepComplete") : t("pathway.markStepComplete")}
                    </button>
                  )}
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

function getStepSkill(stepDescription: string, skills: string[], stepIndex: number): string | undefined {
  if (!skills.length) return undefined;
  const stopWords = new Set(["and", "the", "with", "from", "your", "this", "that", "into", "using", "learn", "build", "create", "practice"]);
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const stepTokens = new Set(normalize(stepDescription).split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)));
  let bestSkill: string | undefined;
  let bestOverlap = 0;

  for (const skill of skills) {
    const normalizedSkill = normalize(skill);
    if (normalizedSkill && normalize(stepDescription).includes(normalizedSkill)) return skill;
    const overlap = normalize(skill).split(/\s+/).filter((word) => word.length > 2 && stepTokens.has(word)).length;
    if (overlap > bestOverlap) {
      bestSkill = skill;
      bestOverlap = overlap;
    }
  }
  return bestSkill ?? skills[Math.min(stepIndex, skills.length - 1)];
}
