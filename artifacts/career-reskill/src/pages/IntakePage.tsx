import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGeneratedPathwayQueryKey,
  useGeneratePathway,
} from '@workspace/api-client-react';
import { ArrowRight, Check, Clock3, UserRound } from 'lucide-react';
import { INTEREST_OPTIONS, type CareerProfile } from '../data/catalog';

const EMPTY_PROFILE: CareerProfile = { currentRole: '', yearsExperience: 5, industry: '', skills: [], interests: [], weeklyHours: 4 };

export function IntakePage({
  profileId,
  profile,
  profileLoading,
  onSave,
  isSaving,
}: {
  profileId: string;
  profile: CareerProfile | null;
  profileLoading: boolean;
  onSave: (profile: CareerProfile) => Promise<void>;
  isSaving: boolean;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const pathwayMutation = useGeneratePathway();
  const [form, setForm] = useState<CareerProfile>(profile ?? EMPTY_PROFILE);
  const [skillsText, setSkillsText] = useState((profile?.skills ?? []).join(', '));
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pathwayFailed, setPathwayFailed] = useState(false);
  const isSubmitting = isSaving || pathwayMutation.isPending;

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setSkillsText(profile.skills.join(', '));
    }
  }, [profile]);

  const update = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleInterest = (interest: string) => update('interests', form.interests.includes(interest) ? form.interests.filter((item) => item !== interest) : [...form.interests, interest]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const issues = [];
    if (!form.currentRole.trim()) issues.push('Add your current role.');
    if (!form.industry.trim()) issues.push('Choose or enter your industry.');
    if (!skillsText.trim()) issues.push('Add at least one skill or strength.');
    if (!form.interests.length) issues.push('Choose at least one area of interest.');
    if (issues.length) { setErrors(issues); setSaved(false); return; }
    const cleaned = { ...form, currentRole: form.currentRole.trim(), industry: form.industry.trim(), skills: skillsText.split(',').map((skill) => skill.trim()).filter(Boolean) };
    setErrors([]);
    setSaved(false);
    setSaveFailed(false);
    setPathwayFailed(false);

    try {
      await onSave(cleaned);
      setForm(cleaned);
    } catch {
      setSaveFailed(true);
      return;
    }

    try {
      const generated = await pathwayMutation.mutateAsync({
        data: { profileId, profile: cleaned },
      });
      queryClient.setQueryData(getGetGeneratedPathwayQueryKey(profileId), generated);
      setSaved(true);
      navigate('/pathway');
    } catch {
      setPathwayFailed(true);
    }
  };

  if (profileLoading) {
    return <div className="page-content"><div className="section-card loading-card" role="status" data-testid="status-profile-loading">Loading your saved profile…</div></div>;
  }

  return (
    <div className="page-content">
      <div className="fade-in">
        <div className="eyebrow">A little about you</div>
        <h1 className="page-title">Your experience is<br />a strong starting point.</h1>
        <p className="page-subtitle">A few details help us suggest adjacent roles and realistic learning steps. Your profile is saved in the career database associated with this browser.</p>
      </div>
      <form className="form-layout fade-in delay-1" onSubmit={submit} data-testid="form-career-profile">
        <section className="section-card form-panel">
          <h2 className="form-section-title">Your experience</h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="current-role">Current role <span className="field-hint">Required</span></label>
              <input id="current-role" className="input-control" value={form.currentRole} onChange={(event) => update('currentRole', event.target.value)} placeholder="e.g. Project manager" data-testid="input-current-role" />
            </div>
            <div className="field">
              <label htmlFor="industry">Industry <span className="field-hint">Required</span></label>
              <input id="industry" className="input-control" list="industry-options" value={form.industry} onChange={(event) => update('industry', event.target.value)} placeholder="e.g. Healthcare" data-testid="input-industry" />
              <datalist id="industry-options">{['Healthcare', 'Financial services', 'Education', 'Manufacturing', 'Technology', 'Government', 'Retail', 'Energy', 'Professional services'].map((industry) => <option key={industry} value={industry} />)}</datalist>
            </div>
          </div>
          <div className="field">
            <label htmlFor="years-experience">Years of experience <span className="field-hint">{form.yearsExperience} years</span></label>
            <div className="hours-control"><input id="years-experience" aria-label="Years of experience" type="range" min="0" max="40" value={form.yearsExperience} onChange={(event) => update('yearsExperience', Number(event.target.value))} data-testid="input-years-experience" /><span className="hours-number" data-testid="text-years-value">{form.yearsExperience}</span></div>
          </div>
          <div className="field">
            <label htmlFor="existing-skills">Skills, strengths, and tools <span className="field-hint">Separate with commas</span></label>
            <textarea id="existing-skills" className="textarea-control" value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="e.g. client relationships, project planning, Excel, team coaching" data-testid="input-existing-skills" />
          </div>
          <h2 className="form-section-title" style={{ marginTop: 23 }}>What draws your attention?</h2>
          <div className="field" data-testid="group-interest-options">
            <label>Areas you’re curious about <span className="field-hint">Choose all that fit</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = form.interests.includes(interest);
                return <button type="button" key={interest} onClick={() => toggleInterest(interest)} className={`interest-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} data-testid={`button-interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>{selected && <Check size={12} />}{interest}</button>;
              })}
            </div>
          </div>
          <div className="field" style={{ marginTop: 22 }}>
            <label htmlFor="weekly-hours">Time you can set aside each week <span className="field-hint">{form.weeklyHours} hours</span></label>
            <div className="hours-control"><input id="weekly-hours" type="range" min="1" max="15" value={form.weeklyHours} onChange={(event) => update('weeklyHours', Number(event.target.value))} data-testid="input-weekly-hours" /><span className="hours-number" data-testid="text-weekly-hours-value">{form.weeklyHours}h</span></div>
          </div>
          {errors.length > 0 && <div className="form-errors" role="alert" data-testid="status-form-errors">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
          {saveFailed && <div className="form-errors" role="alert" data-testid="status-profile-save-error">Your profile could not be saved. Check the API server and try again.</div>}
          {pathwayMutation.isPending && <div className="form-success" role="status" data-testid="status-pathway-generating">Your profile is saved. Generating three career paths…</div>}
          {pathwayFailed && <div className="form-errors" role="alert" data-testid="status-pathway-generation-error">Your profile is saved, but pathway generation failed. Check the API or RunPod configuration and try again.</div>}
          {saved && <div className="form-success" role="status" data-testid="status-profile-saved">Profile saved. Your pathway is ready.</div>}
          <div className="form-footer">
            <span className="form-footnote">No perfect answers. This is a working profile you can revisit anytime.</span>
            <button type="submit" className="button-primary" disabled={isSubmitting} data-testid="button-save-profile">
              {isSaving ? 'Saving profile…' : pathwayMutation.isPending ? 'Generating pathways…' : profile ? 'Save changes' : 'Build my pathway'}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <aside className="aside-panel">
          <h3>Built around the work you’ve done</h3>
          <p>Career shifts often start with strengths you already use—not a blank slate.</p>
          <div className="aside-step"><span className="step-number"><UserRound size={12} /></span><span>We’ll look for roles that build on your experience, not replace it.</span></div>
          <div className="aside-step"><span className="step-number">02</span><span>Your interests help us rank possible directions more thoughtfully.</span></div>
          <div className="aside-step"><span className="step-number"><Clock3 size={12} /></span><span>Your weekly time shapes a learning pace that feels doable.</span></div>
        </aside>
      </form>
    </div>
  );
}
