import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGeneratedPathwayQueryKey,
  type GeneratedPathway,
} from '@workspace/api-client-react';
import { ArrowRight, Clock3, ExternalLink, Layers, LoaderCircle, Search, ShieldCheck, UserRound, X, Zap } from 'lucide-react';
import {
  addInterestSelection,
  getInterestEntryOptions,
  INTEREST_OPTIONS,
  toggleInterestSelection,
  type CareerProfile,
} from '../data/catalog';
import {
  MAX_SKILLS,
  SECTIONS,
  cleanBackground,
  isLinkedInProfileUrl,
  parseSkills,
  safeExternalUrl,
  validateProfileIssues,
  issueAttributes,
  type ErrorFocusRequest,
  type ProfileIssue,
  type SectionKey,
} from '../data/professional-profile';
import { SectionEditor } from '../components/profile/SectionEditor';
import type { ProfessionalBackground, ProfessionalEntry } from '@workspace/api-client-react';
import './profile-intake.css';

const EMPTY_PROFILE: CareerProfile = { currentRole: '', yearsExperience: 5, industry: '', skills: [], interests: [], weeklyHours: 4, profileMode: 'quick', professionalBackground: {} };
const STATUS_PRESETS = ['Student', 'Recent graduate', 'Career break'];

function toDraft(profile: CareerProfile | null): CareerProfile {
  if (!profile) return EMPTY_PROFILE;
  return {
    currentRole: profile.currentRole ?? '',
    yearsExperience: profile.yearsExperience ?? 0,
    industry: profile.industry ?? '',
    skills: profile.skills ?? [],
    interests: profile.interests ?? [],
    weeklyHours: profile.weeklyHours ?? 4,
    profileMode: profile.profileMode === 'detailed' ? 'detailed' : 'quick',
    professionalBackground: profile.professionalBackground ?? {},
  };
}

function saveErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const data = (error as { data?: unknown }).data;
  if (isRecord(data) && typeof data.error === 'string' && data.error.trim()) return data.error;
  return null;
}
const SUBMISSION_MESSAGES = [
  'Saving profile…',
  'Analyzing your skills…',
  'Comparing evidence-grounded adoption scenarios…',
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
  const [form, setForm] = useState<CareerProfile>(() => toDraft(profile));
  const [skillsText, setSkillsText] = useState((profile?.skills ?? []).join(', '));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [focusRequest, setFocusRequest] = useState<ErrorFocusRequest | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [interestSearch, setInterestSearch] = useState('');
  const [activeInterestIndex, setActiveInterestIndex] = useState(0);
  const [interestDropdownHeight, setInterestDropdownHeight] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState<string | false>(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const initializedFor = useRef<string | null>(profile ? profileId : null);
  const isDirty = useRef(false);
  const interestSuggestionsRef = useRef<HTMLDivElement>(null);
  const isSubmitting = isSaving || isFormSubmitting;
  const mode = form.profileMode === 'detailed' ? 'detailed' : 'quick';
  // Recompute after the first attempt so corrected or deleted fields never leave stale links.
  const errors = validationAttempted ? validateProfileIssues(form, parseSkills(skillsText)) : [];
  const errorProps = (id: string) => issueAttributes(errors, id);
  const followError = (issue: ProfileIssue) => {
    if (issue.target.detailedOnly && mode !== 'detailed') update('profileMode', 'detailed');
    setFocusRequest((current) => ({ ...issue.target, requestId: (current?.requestId ?? 0) + 1 }));
  };

  useLayoutEffect(() => {
    if (validationAttempt) {
      errorSummaryRef.current?.focus();
      errorSummaryRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [validationAttempt]);

  useLayoutEffect(() => {
    if (!focusRequest || focusRequest.section) return;
    const control = document.getElementById(focusRequest.controlId);
    control?.focus({ preventScroll: true });
    control?.scrollIntoView({ block: 'center' });
  }, [focusRequest]);
  const interestSuggestions = getInterestEntryOptions(interestSearch, form.interests);
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
  }, [isInterestDropdownOpen, interestSuggestionsKey, mode]);

  // Initialise once per profile id; later cache updates/refetches never clobber the draft.
  useEffect(() => {
    if (!profile || initializedFor.current === profileId) return;
    initializedFor.current = profileId;
    if (isDirty.current) return;
    setForm(toDraft(profile));
    setSkillsText(profile.skills.join(', '));
  }, [profile, profileId]);

  useEffect(() => {
    if (!isFormSubmitting) return;
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % SUBMISSION_MESSAGES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [isFormSubmitting]);

  const editForm = (fn: (current: CareerProfile) => CareerProfile) => {
    if (submissionLock.current) return;
    isDirty.current = true;
    setForm(fn);
  };
  const update = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) => editForm((current) => ({ ...current, [key]: value }));
  const background: ProfessionalBackground = form.professionalBackground ?? {};
  const updateBackground = <K extends keyof ProfessionalBackground>(key: K, value: ProfessionalBackground[K]) =>
    editForm((current) => ({ ...current, professionalBackground: { ...(current.professionalBackground ?? {}), [key]: value } }));
  const updateSection = (key: SectionKey, entries: ProfessionalEntry[]) => updateBackground(key, entries);
  const editSkills = (text: string) => { if (submissionLock.current) return; isDirty.current = true; setSkillsText(text); };
  const skillCount = parseSkills(skillsText).length;
  const linkedinValue = background.linkedinUrl?.trim() ?? '';
  const linkedinHref = linkedinValue && isLinkedInProfileUrl(linkedinValue) ? safeExternalUrl(linkedinValue) : null;
  const toggleInterest = (interest: string) => editForm((current) => ({
    ...current,
    interests: toggleInterestSelection(current.interests, interest),
  }));
  const addInterest = (interest: string) => {
    editForm((current) => current.interests.includes(interest)
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
    if (!interestSuggestions.length) {
      if (event.key === 'Enter' && interestSearch.trim()) {
        event.preventDefault();
        setInterestSearch('');
      }
      return;
    }
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
    const skills = parseSkills(skillsText);
    const issues = validateProfileIssues(form, skills);
    if (issues.length) {
      setValidationAttempted(true);
      setValidationAttempt((current) => current + 1);
      setSaved(false);
      return;
    }
    const cleaned: CareerProfile = {
      ...form,
      currentRole: form.currentRole.trim(),
      industry: form.industry.trim(),
      skills,
      profileMode: mode,
      professionalBackground: cleanBackground(form.professionalBackground),
    };
    setValidationAttempted(false);
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
        setSkillsText(cleaned.skills.join(', '));
        isDirty.current = false;
      } catch (error) {
        setSaveFailed(saveErrorMessage(error) ?? 'Your profile could not be saved. Check the API server and try again.');
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

  const roleAndIndustryFields = (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="current-role">Current role or status <span className="field-hint">Required</span></label>
        <input id="current-role" {...errorProps('current-role')} className="input-control" value={form.currentRole} onChange={(event) => update('currentRole', event.target.value)} placeholder="e.g. Project manager or Student" data-testid="input-current-role" />
        <div className="pi-presets">
          {STATUS_PRESETS.map((preset) => (
            <button type="button" key={preset} className={`pi-preset ${form.currentRole === preset ? 'is-active' : ''}`} onClick={() => update('currentRole', preset)} data-testid={`button-status-${preset.toLowerCase().replaceAll(' ', '-')}`}>{preset}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="industry">{mode === 'detailed' ? 'Current industry' : 'Industry'} <span className="field-hint">Required</span></label>
        <input id="industry" {...errorProps('industry')} className="input-control" list="industry-options" value={form.industry} onChange={(event) => update('industry', event.target.value)} placeholder="e.g. Healthcare or Education" data-testid="input-industry" />
        <datalist id="industry-options">{['Healthcare', 'Financial services', 'Education', 'Manufacturing', 'Technology', 'Government', 'Retail', 'Energy', 'Professional services'].map((industry) => <option key={industry} value={industry} />)}</datalist>
      </div>
    </div>
  );
  const experienceField = (
    <div className="field">
      <label htmlFor="years-experience">Years of experience <span className="field-hint">{form.yearsExperience} years{form.yearsExperience === 0 ? ' (fine for students)' : ''}</span></label>
      <div className="hours-control"><input id="years-experience" aria-label="Years of experience" type="range" min="0" max="40" value={form.yearsExperience} onChange={(event) => update('yearsExperience', Number(event.target.value))} data-testid="input-years-experience" /><span className="hours-number" data-testid="text-years-value">{form.yearsExperience}</span></div>
    </div>
  );
  const skillsField = (
    <div className="field">
      <label htmlFor="existing-skills">Skills, strengths, and tools <span className={`field-hint ${skillCount > MAX_SKILLS ? 'pi-over' : ''}`} data-testid="text-skill-count">Required · {skillCount} / {MAX_SKILLS}, separate with commas</span></label>
      <textarea id="existing-skills" {...errorProps('existing-skills')} className="textarea-control" value={skillsText} onChange={(event) => editSkills(event.target.value)} placeholder="e.g. client relationships, project planning, Excel, team coaching" data-testid="input-existing-skills" />
      {skillCount > MAX_SKILLS && <p className="pi-field-error" role="alert" data-testid="status-skill-limit">You have {skillCount} skills. Remove {skillCount - MAX_SKILLS} to save; nothing is trimmed automatically.</p>}
    </div>
  );
  const learningPreferences = (
    <>
      <div className="field" data-testid="group-interest-options">
        <label htmlFor="interest-search">Areas you’re curious about <span className="field-hint">Choose all that fit</span></label>
        <p className="field-hint" id="interest-help">Choose a suggestion or add your own interest.</p>
        <div
          className="interest-search"
          style={isInterestDropdownOpen ? { paddingBottom: `${interestDropdownHeight + 8}px` } : undefined}
        >
          <div className="interest-search-anchor">
            <Search size={15} aria-hidden="true" />
            <input
              id="interest-search"
              {...errorProps('interest-search')}
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
              aria-describedby="interest-help"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isInterestDropdownOpen}
              aria-controls="interest-suggestions"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `interest-suggestion-${activeSuggestionIndex}` : undefined}
              data-testid="input-interest-search"
            />
            {interestSearch && (
              <button type="button" className="interest-search-clear" onClick={() => setInterestSearch('')} aria-label="Clear interest search" data-testid="button-clear-interest-search">
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
                    <span>{INTEREST_OPTIONS.includes(interest) ? interest : `Add “${interest}”`}</span><span className="interest-suggestion-hint">{INTEREST_OPTIONS.includes(interest) ? 'Add' : 'Custom'}</span>
                  </div>
                )) : (
                  <p className="interest-no-results" role="status" data-testid="text-no-interest-results">This interest is already selected.</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="interest-tag-list" role="group" aria-label="Selected areas of interest" data-testid="list-selected-interests">
          {form.interests.map((interest) => (
            <button type="button" key={interest} className="interest-tag" onClick={() => toggleInterest(interest)} aria-label={`Remove ${interest}`} data-testid={`button-remove-interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
              <span>{interest}</span><X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="weekly-hours">Weekly hours available for learning <span className="field-hint">{form.weeklyHours} hours</span></label>
        <p className="field-hint" style={{ marginTop: -3, marginBottom: 8 }} data-testid="text-weekly-hours-helper">How much time can you realistically dedicate to upskilling courses?</p>
        <div className="hours-control"><input id="weekly-hours" type="range" min="1" max="15" value={form.weeklyHours} onChange={(event) => update('weeklyHours', Number(event.target.value))} data-testid="input-weekly-hours" /><span className="hours-number" data-testid="text-weekly-hours-value">{form.weeklyHours}h</span></div>
      </div>
    </>
  );
  const statusAndFooter = (
    <>
      {errors.length > 0 && (
        <div ref={errorSummaryRef} className="form-errors pi-error-summary" role="alert" tabIndex={-1} aria-labelledby="profile-errors-title" data-testid="status-form-errors">
          <strong id="profile-errors-title" className="pi-errors-title">Fix {errors.length === 1 ? 'this' : `these ${errors.length} items`} before saving:</strong>
          <ul className="pi-error-list">{errors.map((issue) => (
            <li key={issue.id} id={issue.id}>
              <a className="pi-error-link" href={`#${issue.target.controlId}`} onClick={(event) => { event.preventDefault(); followError(issue); }}>
                {issue.message}{issue.target.detailedOnly && mode === 'quick' && <span className="pi-error-mode"> (opens Detailed profile)</span>}
              </a>
            </li>
          ))}</ul>
        </div>
      )}
      {saveFailed && <div className="form-errors" role="alert" data-testid="status-profile-save-error">{saveFailed}</div>}
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
    </>
  );

  return (
    <div className="page-content">
      <div className="fade-in">
        <div className="eyebrow">A little about you</div>
        <h1 className="page-title">Your experience is<br />a strong starting point.</h1>
        <p className="page-subtitle">Start quick, or add the detail that tells your story. Both views edit the same profile, saved on this device.</p>
      </div>
      <div className="form-layout fade-in delay-1">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (e.key === 'Enter' && target.tagName === 'INPUT' && target.closest('.pi-detailed')) e.preventDefault();
        }}
        aria-busy={isSubmitting}
        data-testid="form-career-profile"
      >
        <fieldset className="pi-fieldset" disabled={isSubmitting} data-testid="fieldset-career-profile">
        <div className="pi-mode" role="radiogroup" aria-label="Profile detail level" data-testid="group-profile-mode">
          {([
            ['quick', 'Quick profile', 'Six essentials, about two minutes', Zap],
            ['detailed', 'Detailed profile', 'Experience, education, projects and more', Layers],
          ] as const).map(([value, label, caption, Icon]) => (
            <label key={value} className={`pi-mode-option ${mode === value ? 'is-active' : ''}`} data-testid={`option-mode-${value}`}>
              <input type="radio" name="profile-mode" value={value} checked={mode === value} onChange={() => { setFocusRequest(null); update('profileMode', value); }} data-testid={`radio-mode-${value}`} />
              <Icon size={15} aria-hidden="true" />
              <span><strong>{label}</strong><small>{caption}</small></span>
            </label>
          ))}
          <span className={`pi-mode-thumb ${mode}`} aria-hidden="true" />
        </div>
        {mode === 'quick' && (
        <section className="section-card form-panel" data-testid="panel-quick-profile">
          <h2 className="form-section-title">Your experience</h2>
          {roleAndIndustryFields}
          {experienceField}
          {skillsField}
          <h2 className="form-section-title" style={{ marginTop: 23 }}>What draws your attention?</h2>
          {learningPreferences}
          {statusAndFooter}
        </section>
        )}

        {mode === 'detailed' && (
          <div className="pi-detailed" data-testid="panel-detailed-profile">
            <section className="section-card form-panel">
              <h2 className="form-section-title">Professional identity</h2>
              {roleAndIndustryFields}
              {experienceField}
              <p className="pi-helper">The details below are optional. Add only what you want to share.</p>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="bg-display-name">Display name</label>
                  <input id="bg-display-name" {...errorProps('bg-display-name')} className="input-control" value={background.displayName ?? ''} onChange={(e) => updateBackground('displayName', e.target.value)} data-testid="input-display-name" />
                </div>
                <div className="field">
                  <label htmlFor="bg-location">Location <span className="field-hint">Context only</span></label>
                  <input id="bg-location" {...errorProps('bg-location')} className="input-control" value={background.location ?? ''} onChange={(e) => updateBackground('location', e.target.value)} placeholder="e.g. Kuala Lumpur, Malaysia" data-testid="input-location" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="bg-headline">Professional headline</label>
                <input id="bg-headline" {...errorProps('bg-headline')} className="input-control" value={background.headline ?? ''} onChange={(e) => updateBackground('headline', e.target.value)} placeholder="e.g. Final-year CS student building data tools" data-testid="input-headline" />
              </div>
              <div className="field">
                <label htmlFor="bg-target-industry">Target industry</label>
                <input id="bg-target-industry" {...errorProps('bg-target-industry')} className="input-control" list="industry-options" value={background.targetIndustry ?? ''} onChange={(e) => updateBackground('targetIndustry', e.target.value)} placeholder="e.g. Software development" data-testid="input-target-industry" />
              </div>
              <div className="field">
                <label htmlFor="bg-about">About <span className="field-hint">{(background.about ?? '').length} / 5000</span></label>
                <textarea id="bg-about" {...errorProps('bg-about')} className="textarea-control" value={background.about ?? ''} onChange={(e) => updateBackground('about', e.target.value)} placeholder="A short summary in your own words" data-testid="input-about" />
              </div>
              <div className="field">
                <label htmlFor="bg-linkedin">LinkedIn profile URL</label>
                <input id="bg-linkedin" {...errorProps('bg-linkedin')} aria-invalid={errorProps('bg-linkedin')['aria-invalid'] || Boolean(linkedinValue && !linkedinHref) || undefined} aria-describedby={[errorProps('bg-linkedin')['aria-describedby'], linkedinValue && !linkedinHref ? 'linkedin-url-error' : ''].filter(Boolean).join(' ') || undefined} className="input-control" type="url" inputMode="url" value={background.linkedinUrl ?? ''} onChange={(e) => updateBackground('linkedinUrl', e.target.value)} placeholder="https://www.linkedin.com/in/your-name" data-testid="input-linkedin-url" />
                {linkedinValue && !linkedinHref && <p id="linkedin-url-error" className="pi-field-error" role="alert">Use a profile link like https://www.linkedin.com/in/your-name.</p>}
                <p className="pi-helper">Saved as a link for your reference only. It does not connect your LinkedIn account or retrieve your profile.
                  {linkedinHref && <> <a className="pi-link" href={linkedinHref} target="_blank" rel="noopener noreferrer" data-testid="link-linkedin-profile">Open link<ExternalLink size={11} aria-hidden="true" /></a></>}
                </p>
              </div>
              <div className="pi-honest" data-testid="text-matching-disclosure">
                <ShieldCheck size={15} aria-hidden="true" />
                <p><strong>What informs your matches.</strong> Only explicitly tagged skills on entries, education coursework, project technologies and exact course or certification titles feed the analysis. Descriptions, achievements, GPA, test scores, names, location and links are kept for your record but never treated as proof of qualification or boost ranking.</p>
              </div>
            </section>

            <section className="section-card form-panel pi-sections">
              <h2 className="form-section-title">Background <span className="pi-optional">Professional records optional</span></h2>
              {skillsField}
              {SECTIONS.map((section) => (
                <SectionEditor
                  key={section.key}
                  section={section}
                  entries={background[section.key] ?? []}
                  onChange={(entries) => updateSection(section.key, entries)}
                  idPrefix="profile"
                  issues={errors}
                  focusRequest={focusRequest}
                />
              ))}
            </section>

            <section className="section-card form-panel" data-testid="panel-learning-preferences">
              <h2 className="form-section-title">Learning preferences</h2>
              {learningPreferences}
            </section>
            <section className="section-card form-panel">{statusAndFooter}</section>
          </div>
        )}
        </fieldset>
      </form>
        <aside className="aside-panel">
          <h3>Built around the work you’ve done</h3>
          <p>{mode === 'quick' ? 'Career shifts often start with strengths you already use, not a blank slate.' : 'Students and career switchers alike: no job history is required. Add projects, coursework or volunteering instead.'}</p>
          <div className="aside-step"><span className="step-number"><UserRound size={12} /></span><span>We’ll look for roles that build on your experience, not replace it.</span></div>
          <div className="aside-step"><span className="step-number">02</span><span>Your interests help us rank possible directions more thoughtfully.</span></div>
          <div className="aside-step"><span className="step-number"><Clock3 size={12} /></span><span>Your weekly time shapes a learning pace that feels doable.</span></div>
        </aside>
      </div>
    </div>
  );
}
