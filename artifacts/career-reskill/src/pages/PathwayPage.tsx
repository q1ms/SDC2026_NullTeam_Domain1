import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import {
  getGetGeneratedPathwayQueryKey,
  getListSdgSkillMappingsQueryKey,
  useGetGeneratedPathway,
  useGetPathwayDemo,
  getGetPathwayDemoQueryKey,
  useListSdgSkillMappings,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  BookmarkCheck,
  Compass,
  Globe2,
  Sparkles,
} from "lucide-react";
import type { CareerProfile } from "../data/catalog";
import { PersonalizedReading } from "../components/PersonalizedReading";
import { ScenarioCard } from "../components/ScenarioCard";
import { EvidenceList } from "../components/EvidenceList";
import { AdoptionComparisonPanel } from "../components/AdoptionComparisonPanel";
import { scenarioLabel } from "../lib/adoption-comparison";
import { getPersonalizedSdgNumbers, prioritizeSdgMappings } from "../lib/personalized-sdgs";
import { useLanguage } from "../i18n/LanguageContext";

export function PathwayPage({
  profileId,
  profile,
  profileLoading,
}: {
  profileId: string;
  profile: CareerProfile | null;
  profileLoading: boolean;
}) {
  const { t } = useLanguage();
  const search = useSearch();
  const isDemo = new URLSearchParams(search).get("demo") === "1";
  const [comparisonId, setComparisonId] = useState<string>("moderate");
  const personalQuery = useGetGeneratedPathway(profileId, {
    query: {
      queryKey: getGetGeneratedPathwayQueryKey(profileId),
      enabled: Boolean(!isDemo && profile && !profileLoading),
      retry: false,
    },
  });
  const sdgsQuery = useListSdgSkillMappings({
    query: { queryKey: getListSdgSkillMappingsQueryKey(), retry: false },
  });

  const demoQuery = useGetPathwayDemo({
    query: { queryKey: getGetPathwayDemoQueryKey(), enabled: isDemo, retry: false },
  });
  const pathwayQuery = isDemo ? demoQuery : personalQuery;
  const analysis = pathwayQuery.data?.analysis;
  const activeComparison = analysis?.comparisons.find((c) => c.id === comparisonId) ?? analysis?.comparisons[0];
  const evidenceMap = useMemo(
    () => new Map((analysis?.evidence.signals ?? []).map((s) => [s.id, s])),
    [analysis],
  );

  if (!isDemo && profileLoading) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-profile-loading">{t('pathway.loading')}</div></div>;
  }

  if (!isDemo && !profile) {
    return (
      <div className="page-content">
        <div className="eyebrow">{t('navigation.pathways')}</div>
        <h1 className="page-title" data-testid="heading-pathway-title">{t('pathway.emptyTitle')}</h1>
        <div className="empty-card" style={{ marginTop: 28 }} data-testid="empty-pathway-profile">
          <div className="empty-mark"><Compass size={23} /></div>
          <h2>{t('pathway.noProfile')}</h2>
          <p>{t('pathway.noProfileBody')}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}><Link href="/intake" className="button-primary" data-testid="link-pathway-intake">{t('pathway.createProfile')} <ArrowRight size={15} /></Link><Link href="/pathway?demo=1" className="button-quiet" data-testid="link-pathway-demo">{t('pathway.sampleDemo')}</Link></div>
        </div>
      </div>
    );
  }

  if (pathwayQuery.isLoading) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-pathway-loading">{t('pathway.loading')}</div></div>;
  }

  if (pathwayQuery.isError) {
    return (
      <div className="page-content">
        <div className="form-errors" role="alert" data-testid="status-pathway-error">
          <p>{t('pathway.loadError')}</p>
          <button className="button-quiet" onClick={() => void pathwayQuery.refetch()}>{t('pathway.retry')}</button>
        </div>
      </div>
    );
  }

  if (!pathwayQuery.data) {
    return (
      <div className="page-content">
        <div className="eyebrow">{t('navigation.pathways')}</div>
        <h1 className="page-title">{t('pathway.noGeneratedTitle')}</h1>
        <div className="empty-card" style={{ marginTop: 28 }} data-testid="empty-pathway-generated">
          <div className="empty-mark"><Compass size={23} /></div>
          <h2>{t('pathway.noPaths')}</h2>
          <p>{t('pathway.submitToGenerate')}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}><Link href="/intake" className="button-primary" data-testid="link-pathway-generate">{t('pathway.build')} <ArrowRight size={15} /></Link><Link href="/pathway?demo=1" className="button-quiet" data-testid="link-pathway-demo-empty">{t('pathway.sampleDemo')}</Link></div>
        </div>
      </div>
    );
  }

  const scenarios = activeComparison?.scenarios ?? pathwayQuery.data.scenarios;
  const otherComparison = analysis?.comparisons.find((c) => c !== activeComparison);
  const activeComparisonLabel = activeComparison ? scenarioLabel(activeComparison.id, activeComparison.name) : undefined;
  const otherComparisonLabel = otherComparison ? scenarioLabel(otherComparison.id, otherComparison.name) : undefined;
  const top = scenarios[0];
  const personalizedSdgNumbers = getPersonalizedSdgNumbers(scenarios.map((scenario) => scenario.unSdgTag));
  const prioritizedSdgs = sdgsQuery.data
    ? prioritizeSdgMappings(sdgsQuery.data, personalizedSdgNumbers)
    : undefined;

  return (
    <div className="page-content">
      <div className="hero-row fade-in">
        <div>
          <div className="eyebrow">{t('pathway.eyebrow')}</div>
          <h1 className="page-title">{t('pathway.title')}</h1>
          <p className="page-subtitle">{t('pathway.subtitle')}</p>
        </div>
        <Link href="/intake" className="button-quiet" data-testid="button-edit-profile"><BookmarkCheck size={15} /> {t('pathway.edit')}</Link>
      </div>

      {isDemo && (
        <div className="sample-banner" role="note" data-testid="status-demo-banner">
          {t('pathway.demoBanner')} <Link href="/pathway" data-testid="link-exit-demo">{t('pathway.backToPathway')}</Link>
        </div>
      )}
      {isDemo || !profile ? (
        <div className="personal-strip fade-in delay-1" data-testid="status-pathway-profile">
          <span className="meta-chip"><Sparkles size={13} /> {t('pathway.sampleProfile')} <strong>{analysis?.profileSummary ?? "Sample learner"}</strong></span>
          {top?.paceEstimate && <span className="meta-chip">{top.paceEstimate}</span>}
        </div>
      ) : (
        <div className="personal-strip fade-in delay-1" data-testid="status-pathway-profile">
          <span className="meta-chip"><Sparkles size={13} /> {t('pathway.basedOn')} <strong>{profile.currentRole}</strong></span>
          <span className="meta-chip">{profile.industry}</span>
          <span className="meta-chip">{profile.weeklyHours} {t('pathway.learningHours')}</span>
        </div>
      )}

      {!analysis && (
        <div className="form-errors" role="note" data-testid="status-legacy-pathway">
          This saved pathway was generated before evidence-based ranking existed, so it has no adoption scenarios, sources, or limitations. Regenerate it from your <Link href="/intake" data-testid="link-legacy-regenerate">profile intake</Link> to compare scenarios.
        </div>
      )}
      {analysis && activeComparison && (
        <>
          {!isDemo && <p className="chart-note" data-testid="text-pathway-snapshot-profile">Recommendation profile snapshot: {analysis.profileSummary} If you have edited your profile since generation, regenerate before comparing these options.</p>}
          <AdoptionComparisonPanel analysis={analysis} selectedId={activeComparison.id} onSelect={setComparisonId} />
        </>
      )}

      {top && (
        <section className="rec-banner fade-in delay-1" data-testid="card-top-recommendation">
          <div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>{t('pathway.strongest')}</div>
            <h2>{top.roleTitle}</h2>
            <p>{top.explainableReason}</p>
          </div>
          <div className="banner-figure">{top.matchScore}<small>{activeComparisonLabel ? `${activeComparisonLabel} fit score` : "profile match"}</small></div>
        </section>
      )}

      <div className="section-header fade-in delay-2">
        <div><h2>{t('pathway.scenarios')}{activeComparisonLabel ? ` · ${activeComparisonLabel}` : ""}</h2><p>{t('pathway.scenarioDescription')}</p></div>
        <span className="field-hint" data-testid="text-scenario-count">{t('pathway.pathwayCount').replace('{count}', String(scenarios.length))}</span>
      </div>
      {scenarios.length ? (
        <div className="role-grid">
          {scenarios.map((scenario, index) => <ScenarioCard key={`${activeComparison?.id ?? "legacy"}-${scenario.roleTitle}-${index}`} scenario={scenario} index={index} rank={analysis ? index + 1 : undefined} evidence={evidenceMap} otherScore={otherComparison?.scenarios.find((o) => o.roleTitle === scenario.roleTitle)?.matchScore} otherLabel={otherComparisonLabel} />)}
        </div>
      ) : (
        <div className="section-card loading-card" data-testid="empty-role-recommendations">{t('pathway.noScenarios')}</div>
      )}

      {analysis && (
        <>
          <div className="section-header"><div><h2>{t('pathway.evidenceSnapshot')}</h2><p>{t('pathway.evidenceDescription')} Checked {new Date(analysis.evidence.fetchedAt).toLocaleString()} · {analysis.evidence.newsStatus}</p></div><Link href="/radar" className="button-quiet" data-testid="link-pathway-radar">{t('pathway.openRadar')}</Link></div>
          <section className="section-card" style={{ padding: 20 }}>
            <EvidenceList signals={analysis.evidence.signals} highlight={new Set(scenarios.flatMap((x) => x.evidenceIds ?? []))} />
          </section>
        </>
      )}

      {!isDemo && profile && <PersonalizedReading profile={profile} />}

      <div className="section-header sdg-header fade-in delay-2">
        <div>
          <h2><Globe2 size={18} /> {profile ? "Your Personal SDG Impact" : "UN goals, practical skills"}</h2>
          <p>Highlighted goals connect to your recommended career pathways. Explore curated skill links for each goal; these are not official UN skills guidance.</p>
        </div>
        <span className="field-hint" data-testid="text-sdg-count">
        {sdgsQuery.data ? `${personalizedSdgNumbers.size} pathway matches · ${sdgsQuery.data.length} goals` : "Loading goal mappings"}
        </span>
      </div>
      {sdgsQuery.isLoading && <div className="section-card loading-card" role="status" data-testid="status-sdgs-loading">Loading SDG skill mappings…</div>}
      {sdgsQuery.isError && <div className="form-errors" role="alert" data-testid="status-sdgs-error">Could not load the SDG skill mappings.</div>}
      {prioritizedSdgs && (
        <div className="sdg-grid" data-testid="list-sdg-mappings">
          {prioritizedSdgs.map((goal) => {
            const isPersonalized = personalizedSdgNumbers.has(goal.number);
            return (
            <details className={`sdg-card ${isPersonalized ? "sdg-card-personalized" : "sdg-card-muted"}`} key={goal.number} data-personalized={isPersonalized} data-testid={`details-sdg-${goal.number}`}>
              <summary>
                <span className="sdg-number">{String(goal.number).padStart(2, "0")}</span>
                <span className="sdg-title">{goal.title}</span>
                {isPersonalized && <span className="sdg-impact-badge">Pathway match</span>}
                <span className="sdg-skill-count">{goal.skills.length} skills</span>
              </summary>
              <p>{goal.description}</p>
              <div className="skill-chips">
                {goal.skills.map((skill) => (
                  <span className="skill-chip" key={skill} data-testid={`chip-sdg-${goal.number}-${skill.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{skill}</span>
                ))}
              </div>
            </details>
          );})}
        </div>
      )}

      <div className="footer-note" data-testid="text-pathway-generated-at">{isDemo ? "Sample generated" : "Generated"} {new Date(pathwayQuery.data.generatedAt).toLocaleString()}</div>
      <div className="footer-note" data-testid="text-pathway-disclaimer">Career suggestions are starting points, not guarantees. Check local role requirements and learning options before making decisions.</div>
    </div>
  );
}
