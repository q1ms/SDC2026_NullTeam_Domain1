import { useEffect } from "react";
import { Link } from "wouter";
import {
  getListSdgSkillMappingsQueryKey,
  useGeneratePathway,
  useListSdgSkillMappings,
  type PathwayRecommendation,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Clock3,
  Compass,
  GraduationCap,
  Globe2,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { CareerProfile } from "../data/catalog";

export function PathwayPage({
  profile,
  profileLoading,
}: {
  profile: CareerProfile | null;
  profileLoading: boolean;
}) {
  const pathwayMutation = useGeneratePathway();
  const sdgsQuery = useListSdgSkillMappings({
    query: { queryKey: getListSdgSkillMappingsQueryKey(), retry: false },
  });

  useEffect(() => {
    if (profile) {
      pathwayMutation.mutate({ data: profile });
    }
  }, [profile, pathwayMutation.mutate]);

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

  if (pathwayMutation.isIdle || pathwayMutation.isPending) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-roles-loading">Generating role recommendations…</div></div>;
  }

  if (pathwayMutation.isError || !pathwayMutation.data) {
    return (
      <div className="page-content">
        <div className="form-errors" role="alert" data-testid="status-roles-error">
          <p>Could not generate your recommendations. Check the API or RunPod configuration and try again.</p>
          <button className="button-quiet" onClick={() => pathwayMutation.mutate({ data: profile })}>Try again</button>
        </div>
      </div>
    );
  }

  const recommendations = pathwayMutation.data.recommendations;
  const top = recommendations[0];
  const averageMatch = recommendations.length
    ? Math.round(recommendations.reduce((sum, role) => sum + role.match, 0) / recommendations.length)
    : 0;

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
            <h2>{top.title}</h2>
            <p>{top.description}</p>
          </div>
          <div className="banner-figure">{averageMatch}%<small>profile alignment</small></div>
        </section>
      )}

      <div className="section-header fade-in delay-2">
        <div><h2>Directions to explore</h2><p>Ranked by alignment with your skills and stated interests</p></div>
        <span className="field-hint" data-testid="text-role-source">{pathwayMutation.data.roleCount} roles in SQLite</span>
      </div>
      {recommendations.length ? (
        <div className="role-grid">
          {recommendations.map((role, index) => <RoleCard key={role.id} role={role} index={index} knownSkills={profile.skills} />)}
        </div>
      ) : (
        <div className="section-card loading-card" data-testid="empty-role-recommendations">No role records are available yet.</div>
      )}

      <div className="section-header sdg-header fade-in delay-2">
        <div>
          <h2><Globe2 size={18} /> UN goals, practical skills</h2>
          <p>Explore curated skill links for each goal; these are not official UN skills guidance.</p>
        </div>
        <span className="field-hint" data-testid="text-sdg-count">
          {sdgsQuery.data ? `${sdgsQuery.data.length} goals mapped` : "Loading goal mappings"}
        </span>
      </div>
      {sdgsQuery.isLoading && <div className="section-card loading-card" role="status" data-testid="status-sdgs-loading">Loading SDG skill mappings…</div>}
      {sdgsQuery.isError && <div className="form-errors" role="alert" data-testid="status-sdgs-error">Could not load the SDG skill mappings.</div>}
      {sdgsQuery.data && (
        <div className="sdg-grid" data-testid="list-sdg-mappings">
          {sdgsQuery.data.map((goal) => (
            <details className="sdg-card" key={goal.number} data-testid={`details-sdg-${goal.number}`}>
              <summary>
                <span className="sdg-number">{String(goal.number).padStart(2, "0")}</span>
                <span className="sdg-title">{goal.title}</span>
                <span className="sdg-skill-count">{goal.skills.length} skills</span>
              </summary>
              <p>{goal.description}</p>
              <div className="skill-chips">
                {goal.skills.map((skill) => (
                  <span className="skill-chip" key={skill} data-testid={`chip-sdg-${goal.number}-${skill.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{skill}</span>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="footer-note" data-testid="text-pathway-disclaimer">Role details and salary ranges are illustrative catalog examples. Explore local requirements before making decisions.</div>
    </div>
  );
}

function RoleCard({ role, index, knownSkills }: { role: PathwayRecommendation; index: number; knownSkills: string[] }) {
  const normalize = (text: string) => text.toLowerCase();
  const isKnown = (skill: string) => knownSkills.some((known) => normalize(known).includes(normalize(skill)) || normalize(skill).includes(normalize(known)) && known.length > 3);
  const knownCount = role.skills.filter(isKnown).length;
  return (
    <article className={`section-card role-card fade-in delay-${Math.min(index + 1, 2)}`} data-testid={`card-role-${index}`}>
      <div className="role-head"><h3 className="role-title" data-testid={`text-role-title-${index}`}>{role.title}</h3><span className="match-badge" data-testid={`status-role-match-${index}`}><Check size={11} /> {role.match}% fit</span></div>
      <p className="role-description">{role.description}</p>
      <div className="role-metrics"><span className="metric-tag"><Wallet size={12} />{role.salary}</span><span className="metric-tag"><Clock3 size={12} />{role.timeToReady}</span></div>
      <div className="gap-label">Skills to build · {knownCount} of {role.skills.length} recognized</div>
      <div className="skill-chips">{role.skills.map((skill) => <span className={`skill-chip ${isKnown(skill) ? 'known' : 'missing'}`} key={skill} data-testid={`chip-role-${index}-${skill.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>{isKnown(skill) ? '✓ ' : '+ '}{skill}</span>)}</div>
      <details className="learning-path" data-testid={`details-learning-steps-${index}`}>
        <summary><span><GraduationCap size={14} style={{ verticalAlign: 'middle', marginRight: 7, color: '#347a70' }} />Learning steps</span><span className="field-hint">{role.steps.length} steps</span></summary>
        <ol>{role.steps.map((step, stepIndex) => <li key={step} data-testid={`text-learning-step-${index}-${stepIndex}`}>{step}</li>)}</ol>
      </details>
    </article>
  );
}
