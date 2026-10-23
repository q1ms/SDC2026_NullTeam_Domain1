import { Link } from "wouter";
import {
  getGetGeneratedPathwayQueryKey,
  getListSdgSkillMappingsQueryKey,
  useGetGeneratedPathway,
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
import { getPersonalizedSdgNumbers, prioritizeSdgMappings } from "../lib/personalized-sdgs";

export function PathwayPage({
  profileId,
  profile,
  profileLoading,
}: {
  profileId: string;
  profile: CareerProfile | null;
  profileLoading: boolean;
}) {
  const pathwayQuery = useGetGeneratedPathway(profileId, {
    query: {
      queryKey: getGetGeneratedPathwayQueryKey(profileId),
      enabled: Boolean(profile && !profileLoading),
      retry: false,
    },
  });
  const sdgsQuery = useListSdgSkillMappings({
    query: { queryKey: getListSdgSkillMappingsQueryKey(), retry: false },
  });

  if (profileLoading) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-profile-loading">Loading your saved profile…</div></div>;
  }

  if (!profile) {
    return (
      <div className="page-content">
        <div className="eyebrow">Career pathways</div>
        <h1 className="page-title">A route that starts<br />where you are.</h1>
        <div className="empty-card" style={{ marginTop: 28 }} data-testid="empty-pathway-profile">
          <div className="empty-mark"><Compass size={23} /></div>
          <h2>Your profile helps make this personal.</h2>
          <p>Share your experience, existing skills, and interests first. We’ll use them to rank a few adjacent roles and show the skills to build next.</p>
          <Link href="/intake" className="button-primary" data-testid="link-pathway-intake">Create your profile <ArrowRight size={15} /></Link>
        </div>
      </div>
    );
  }

  if (pathwayQuery.isLoading) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-pathway-loading">Loading your saved career paths…</div></div>;
  }

  if (pathwayQuery.isError) {
    return (
      <div className="page-content">
        <div className="form-errors" role="alert" data-testid="status-pathway-error">
          <p>Could not load your saved career paths. Check the API server and try again.</p>
          <button className="button-quiet" onClick={() => void pathwayQuery.refetch()}>Try again</button>
        </div>
      </div>
    );
  }

  if (!pathwayQuery.data) {
    return (
      <div className="page-content">
        <div className="eyebrow">Career pathways</div>
        <h1 className="page-title">Your next steps<br />start here.</h1>
        <div className="empty-card" style={{ marginTop: 28 }} data-testid="empty-pathway-generated">
          <div className="empty-mark"><Compass size={23} /></div>
          <h2>No career paths have been generated yet.</h2>
          <p>Submit your profile to generate three personalized career scenarios and learning steps.</p>
          <Link href="/intake" className="button-primary" data-testid="link-pathway-generate">Build your pathways <ArrowRight size={15} /></Link>
        </div>
      </div>
    );
  }

  const scenarios = pathwayQuery.data.scenarios;
  const top = scenarios[0];
  const personalizedSdgNumbers = getPersonalizedSdgNumbers(scenarios.map((scenario) => scenario.unSdgTag));
  const prioritizedSdgs = sdgsQuery.data
    ? prioritizeSdgMappings(sdgsQuery.data, personalizedSdgNumbers)
    : undefined;

  return (
    <div className="page-content">
      <div className="hero-row fade-in">
        <div>
          <div className="eyebrow">Your next chapter</div>
          <h1 className="page-title">Good options.<br />Clear next steps.</h1>
          <p className="page-subtitle">A starting set of adjacent directions shaped by the skills and interests you shared. These are possibilities to explore—not a verdict.</p>
        </div>
        <Link href="/intake" className="button-quiet" data-testid="button-edit-profile"><BookmarkCheck size={15} /> Edit your profile</Link>
      </div>

      <div className="personal-strip fade-in delay-1" data-testid="status-pathway-profile">
        <span className="meta-chip"><Sparkles size={13} /> Based on <strong>{profile.currentRole}</strong></span>
        <span className="meta-chip">{profile.industry}</span>
        <span className="meta-chip">{profile.weeklyHours} learning hours / week</span>
      </div>

      {top && (
        <section className="rec-banner fade-in delay-1" data-testid="card-top-recommendation">
          <div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Your strongest starting point</div>
            <h2>{top.roleTitle}</h2>
            <p>{top.explainableReason}</p>
          </div>
          <div className="banner-figure">{top.matchScore}%<small>profile match</small></div>
        </section>
      )}

      <div className="section-header fade-in delay-2">
        <div><h2>Career scenarios</h2><p>Three AI-generated options with the skills and learning steps to explore</p></div>
        <span className="field-hint" data-testid="text-scenario-count">{scenarios.length} pathways</span>
      </div>
      {scenarios.length ? (
        <div className="role-grid">
          {scenarios.map((scenario, index) => <ScenarioCard key={`${scenario.roleTitle}-${index}`} scenario={scenario} index={index} />)}
        </div>
      ) : (
        <div className="section-card loading-card" data-testid="empty-role-recommendations">No career scenarios are available yet.</div>
      )}

      <PersonalizedReading profile={profile} />

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

      <div className="footer-note" data-testid="text-pathway-generated-at">Generated {new Date(pathwayQuery.data.generatedAt).toLocaleString()}</div>
      <div className="footer-note" data-testid="text-pathway-disclaimer">AI suggestions are starting points, not guarantees. Check local role requirements and learning options before making decisions.</div>
    </div>
  );
}
