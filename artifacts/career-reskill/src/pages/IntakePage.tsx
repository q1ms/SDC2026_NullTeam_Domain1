import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGeneratedPathwayQueryKey,
  type GeneratedPathway,
} from '@workspace/api-client-react';
import { ArrowRight, Clock3, LoaderCircle, Search, UserRound, X } from 'lucide-react';
import {
  addInterestSelection,
  getInterestSuggestions,
  toggleInterestSelection,
  type CareerProfile,
} from '../data/catalog';

const EMPTY_PROFILE: CareerProfile = { currentRole: '', yearsExperience: 5, industry: '', skills: [], interests: [], weeklyHours: 4 };
const SUBMISSION_MESSAGES = [
  'Saving profile…',
  'Analyzing your skills…',
  'Generating AI career pathways…',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGeneratedPathway(value: unknown, profileId: string): value is GeneratedPathway {
  if (!isRecord(value) || value.profileId !== profileId || typeof value.generatedAt !== 'string') {
    return false;
  }
  if (!Array.isArray(value.scenarios) || value.scenarios.length !== 3) return false;

  return value.scenarios.every((scenario) => {
    if (!isRecord(scenario)) return false;
    return typeof scenario.roleTitle === 'string'
      && typeof scenario.matchScore === 'number'
      && Number.isInteger(scenario.matchScore)
      && scenario.matchScore >= 1
      && scenario.matchScore <= 100
      && typeof scenario.explainableReason === 'string'
      && Array.isArray(scenario.skillsGap)
      && scenario.skillsGap.every((skill) => typeof skill === 'string')
      && Array.isArray(scenario.reskillingPathway)
      && scenario.reskillingPathway.length === 3
      && scenario.reskillingPathway.every((step) => isRecord(step)
        && typeof step.step === 'string'
        && typeof step.estimatedHours === 'number'
        && Number.isInteger(step.estimatedHours)
        && step.estimatedHours > 0)
      && typeof scenario.unSdgTag === 'string';
  });
}

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
  const [form, setForm] = useState<CareerProfile>(profile ?? EMPTY_PROFILE);
  const [skillsText, setSkillsText] = useState((profile?.skills ?? []).join(', '));
  const [errors, setErrors] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [activeInterestIndex, setActiveInterestIndex] = useState(0);
  const [interestDropdownHeight, setInterestDropdownHeight] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const interestSuggestionsRef = useRef<HTMLDivElement>(null);
  const isSubmitting = isSaving || isFormSubmitting;
  const interestSuggestions = getInterestSuggestions(interestSearch, form.interests);
  const interestSuggestionsKey = interestSuggestions.join('\u0000');
  const isInterestDropdownOpen = Boolean(interestSearch.trim());
  const activeSuggestionIndex = interestSuggestions.length
    ? activeInterestIndex % interestSuggestions.length
    : -1;

  useLayoutEffect(() => {
    if (!isInterestDropdownOpen) {
      setInterestDropdownHeight(0);
      return;
    }

    const dropdown = interestSuggestionsRef.current;
    if (!dropdown) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(dropdown.getBoundingClientRect().height);
      setInterestDropdownHeight((current) => current === nextHeight ? current : nextHeight);
    };

    updateHeight();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight);
    observer?.observe(dropdown);
    return () => observer?.disconnect();
  }, [isInterestDropdownOpen, interestSuggestionsKey]);

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setSkillsText(profile.skills.join(', '));
    }
  }, [profile]);

  useEffect(() => {
    if (!isFormSubmitting) return;
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % SUBMISSION_MESSAGES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [isFormSubmitting]);

  const update = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleInterest = (interest: string) => setForm((current) => ({
    ...current,
    interests: toggleInterestSelection(current.interests, interest),
  }));
  const addInterest = (interest: string) => {
    setForm((current) => current.interests.includes(interest)
      ? current
      : { ...current, interests: addInterestSelection(current.interests, interest) });
    setInterestSearch('');
    setActiveInterestIndex(0);
  };
  const handleInterestSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setInterestSearch('');
      setActiveInterestIndex(0);
      return;
    }
    if (!interestSuggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveInterestIndex((current) => (current + 1) % interestSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveInterestIndex((current) => (current - 1 + interestSuggestions.length) % interestSuggestions.length);
    } else if (event.key === 'Enter' && isInterestDropdownOpen) {
      event.preventDefault();
      addInterest(interestSuggestions[activeSuggestionIndex]);
    }
  };
  const submit = async () => {
    if (submissionLock.current || isSubmitting) return;
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
    setPathwayError(null);
    submissionLock.current = true;
    setLoadingMessageIndex(0);
    setIsFormSubmitting(true);

    try {
      try {
        await onSave(cleaned);
        setForm(cleaned);
      } catch {
        setSaveFailed(true);
        return;
      }

      try {
        const response = await fetch('/api/generate-pathway', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({ profileId, profile: cleaned }),
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = isRecord(result) && typeof result.error === 'string'
            ? result.error
            : `Pathway generation failed (HTTP ${response.status}).`;
          throw new Error(message);
        }
        if (!isGeneratedPathway(result, profileId)) {
          throw new Error('The service did not return three complete, saved career paths.');
        }

        const generated = result;
        queryClient.setQueryData(getGetGeneratedPathwayQueryKey(profileId), generated);
        setSaved(true);
        navigate('/pathway');
      } catch (error) {
        setPathwayError(error instanceof Error ? error.message : 'Please try again.');
      }
    } finally {
      submissionLock.current = false;
      setIsFormSubmitting(false);
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
        <p className="page-subtitle">A few details help us suggest adjacent roles and realistic learning steps. Your profile is saved on this device.</p>
      </div>
      <div className="form-layout fade-in delay-1">
      <form onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }} data-testid="form-career-profile">
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
            <div
              className="interest-search"
              style={isInterestDropdownOpen ? { paddingBottom: `${interestDropdownHeight + 8}px` } : undefined}
            >
              <div className="interest-search-anchor">
                <Search size={15} aria-hidden="true" />
                <input
                  id="interest-search"
                  className="input-control interest-search-input"
                  type="text"
                  value={interestSearch}
                  onChange={(event) => {
                    setInterestSearch(event.target.value);
                    setActiveInterestIndex(0);
                  }}
                  onKeyDown={handleInterestSearchKeyDown}
                  placeholder="Search areas of interest (e.g., tech, health, AI)..."
                  aria-label="Search areas of interest"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isInterestDropdownOpen}
                  aria-controls="interest-suggestions"
                  aria-activedescendant={activeSuggestionIndex >= 0 ? `interest-suggestion-${activeSuggestionIndex}` : undefined}
                  data-testid="input-interest-search"
                />
                {interestSearch && (
                  <button
                    type="button"
                    className="interest-search-clear"
                    onClick={() => setInterestSearch('')}
                    aria-label="Clear interest search"
                    data-testid="button-clear-interest-search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
                {isInterestDropdownOpen && (
                  <div
                    ref={interestSuggestionsRef}
                    id="interest-suggestions"
                    className="interest-suggestions absolute left-0 right-0 top-full z-50"
                    role="listbox"
                    aria-label="Matching areas of interest"
                    data-testid="list-interest-suggestions"
                  >
                    {interestSuggestions.length ? interestSuggestions.map((interest, index) => (
                      <div
                        id={`interest-suggestion-${index}`}
                        key={interest}
                        className={`interest-suggestion ${index === activeSuggestionIndex ? 'active' : ''}`}
                        role="option"
                        aria-selected={index === activeSuggestionIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveInterestIndex(index)}
                        onClick={() => addInterest(interest)}
                        data-testid={`option-interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
                      >
                        <span>{interest}</span>
                        <span className="interest-suggestion-hint">Add</span>
                      </div>
                    )) : (
                      <p className="interest-no-results" role="status" data-testid="text-no-interest-results">
                        No matching areas found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="interest-tag-list" role="group" aria-label="Selected areas of interest" data-testid="list-selected-interests">
              {form.interests.map((interest) => (
                <button
                  type="button"
                  key={interest}
                  className="interest-tag"
                  onClick={() => toggleInterest(interest)}
                  aria-label={`Remove ${interest}`}
                  data-testid={`button-remove-interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
                >
                  <span>{interest}</span>
                  <X size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginTop: 22 }}>
            <label htmlFor="weekly-hours">Weekly hours available for learning <span className="field-hint">{form.weeklyHours} hours</span></label>
            <p className="field-hint" style={{ marginTop: -3, marginBottom: 8 }} data-testid="text-weekly-hours-helper">How much time can you realistically dedicate to upskilling courses?</p>
            <div className="hours-control"><input id="weekly-hours" type="range" min="1" max="15" value={form.weeklyHours} onChange={(event) => update('weeklyHours', Number(event.target.value))} data-testid="input-weekly-hours" /><span className="hours-number" data-testid="text-weekly-hours-value">{form.weeklyHours}h</span></div>
          </div>
          {errors.length > 0 && <div className="form-errors" role="alert" data-testid="status-form-errors">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
          {saveFailed && <div className="form-errors" role="alert" data-testid="status-profile-save-error">Your profile could not be saved. Check the API server and try again.</div>}
          {isFormSubmitting && <div className="form-success flex items-center gap-2" role="status" aria-live="polite" data-testid="status-pathway-generating"><LoaderCircle size={14} className="animate-spin" />{SUBMISSION_MESSAGES[loadingMessageIndex]}</div>}
          {pathwayError && <div className="form-errors" role="alert" data-testid="status-pathway-generation-error">Your profile is saved, but pathway generation failed: {pathwayError} Submit again to retry.</div>}
          {saved && <div className="form-success" role="status" data-testid="status-profile-saved">Profile saved. Your pathway is ready.</div>}
          <div className="form-footer">
            <span className="form-footnote">No perfect answers. This is a working profile you can revisit anytime.</span>
            <button type="submit" className="button-primary" disabled={isSubmitting} data-testid="button-save-profile">
              {isSubmitting
                ? <><LoaderCircle size={15} className="animate-spin" /> Please wait…</>
                : <>{profile ? 'Save changes' : 'Build my pathway'}<ArrowRight size={15} /></>}
            </button>
          </div>
        </section>
      </form>
        <aside className="aside-panel">
          <h3>Built around the work you’ve done</h3>
          <p>Career shifts often start with strengths you already use—not a blank slate.</p>
          <div className="aside-step"><span className="step-number"><UserRound size={12} /></span><span>We’ll look for roles that build on your experience, not replace it.</span></div>
          <div className="aside-step"><span className="step-number">02</span><span>Your interests help us rank possible directions more thoughtfully.</span></div>
          <div className="aside-step"><span className="step-number"><Clock3 size={12} /></span><span>Your weekly time shapes a learning pace that feels doable.</span></div>
        </aside>
      </div>
    </div>
  );
}
