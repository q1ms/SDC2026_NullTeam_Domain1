import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useGenerateCareerInsights, useHealthCheck } from '@workspace/api-client-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Briefcase, FileUp, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Route, Sparkles, Target, X } from 'lucide-react';
import { STARTER_SKILLS, normalizeSkill, rolesFromCsv, type CareerRole, type Scenario } from '@/lib/career-model';
import { getRecommendedRoles, getSelectedRecommendation, getJourneyReadiness } from '@/lib/career-journey';
import { getResourcePlanLines } from '@/lib/career-explain';
import { commitJourney, datasetSnapshot, emptyJourney, JOURNEY_STORAGE_KEY, restoreJourney, type JourneySnapshot } from '@/lib/journey-storage';
import RolePicker from '@/components/role-picker';
import QuestMap from '@/components/quest-map';
import { GapPanel, SdgPanel } from '@/components/gap-panel';
import geometricBackground from '@assets/vecteezy_abstract-white-geometric-shape-futuristic-background-_1792682336575.jpg';
import '@/styles/journey.css';

type WorkspaceView = 'overview' | 'recommendations' | 'route' | 'skills-sdgs';

const workspaceSections: Array<{ id: WorkspaceView; label: string; Icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'recommendations', label: 'Role recommendations', Icon: Briefcase },
  { id: 'route', label: 'Reskilling route', Icon: Route },
  { id: 'skills-sdgs', label: 'Skills & SDGs', Icon: Target },
];

export default function Dashboard() {
  const health = useHealthCheck();
  const insights = useGenerateCareerInsights();
  const [restored] = useState(() => restoreJourney(() => window.localStorage));
  const initial = restored.snapshot;
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [draft, setDraft] = useState('');
  const [step, setStep] = useState<'skills' | 'results'>(initial.step);
  const [scenario, setScenario] = useState<Scenario>(initial.scenario);
  const [activeView, setActiveView] = useState<WorkspaceView>('recommendations');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [roles, setRoles] = useState<CareerRole[]>(initial.dataset.source === 'imported' ? initial.dataset.roles : []);
  const [loading, setLoading] = useState(initial.dataset.source === 'built-in');
  const [datasetError, setDatasetError] = useState('');
  const [csvError, setCsvError] = useState('');
  const [builtIn, setBuiltIn] = useState(initial.dataset.source === 'built-in');
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [storageNotice, setStorageNotice] = useState(restored.notice);
  const [storageStatus, setStorageStatus] = useState('Device storage is ready.');
  const [storageConflict, setStorageConflict] = useState(false);
  const [saveRequest, setSaveRequest] = useState(0);
  const storageBase = useRef(restored.raw);
  const conflictRef = useRef(false);
  const writeGeneration = useRef(0);
  const [aiSig, setAiSig] = useState('');
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const reduceMotion = useReducedMotion();
  const pane = { duration: reduceMotion ? 0 : 0.26, ease: 'easeOut' as const };
  // Focus after the results DOM actually mounts (AnimatePresence waits for the exit).
  const setResultsNode = useCallback((node: HTMLElement | null) => {
    resultsRef.current = node;
    if (node && stepRef.current === 'results') node.focus({ preventScroll: true });
  }, []);
  const sigRef = useRef('');
  const datasetRequest = useRef(0);
  const aiError = insights.error as { status?: number; data?: { error?: string } } | null;

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;

    let frame = 0;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;
    const paintPointer = () => {
      const deltaX = targetX - currentX;
      const deltaY = targetY - currentY;
      currentX += deltaX * 0.16;
      currentY += deltaY * 0.16;
      background.style.setProperty('--parallax-x', `${((currentX - 50) * 1).toFixed(1)}px`);
      background.style.setProperty('--parallax-y', `${((currentY - 50) * 1).toFixed(1)}px`);
      if (Math.abs(deltaX) > 0.08 || Math.abs(deltaY) > 0.08) {
        frame = window.requestAnimationFrame(paintPointer);
      } else {
        frame = 0;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      targetX = Math.min(100, Math.max(0, (event.clientX / window.innerWidth) * 100));
      targetY = Math.min(100, Math.max(0, (event.clientY / window.innerHeight) * 100));
      if (!frame) frame = window.requestAnimationFrame(paintPointer);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const flagConflict = () => {
    conflictRef.current = true;
    setStorageConflict(true);
    setStorageStatus('Saving paused: another tab changed or cleared the saved profile. Your edits in this tab are still here.');
  };
  useEffect(() => {
    const check = () => {
      try {
        if (window.localStorage.getItem(JOURNEY_STORAGE_KEY) !== storageBase.current) flagConflict();
      } catch {
        setStorageStatus('Device storage is unavailable. Your edits are only in this tab.');
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === JOURNEY_STORAGE_KEY || event.key === null)) check();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    check();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', check);
    };
  }, []);

  const loadBuiltIn = async (preserveSelection = false) => {
    const request = ++datasetRequest.current;
    setLoading(true); setDatasetError('');
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/ai-job-trends.csv`);
      if (!res.ok) throw new Error(`Dataset request returned ${res.status}.`);
      const next = rolesFromCsv(await res.text());
      if (request !== datasetRequest.current) return;
      setRoles(next); setBuiltIn(true); setCsvError('');
      if (!preserveSelection) setSelectedId(null);
    } catch (e) { if (request === datasetRequest.current) setDatasetError(e instanceof Error ? e.message : 'The local role dataset could not be loaded.'); }
    finally { if (request === datasetRequest.current) setLoading(false); }
  };
  useEffect(() => {
    if (initial.dataset.source === 'built-in') void loadBuiltIn(true);
    return () => { datasetRequest.current++; };
  }, []);

  const sig = useMemo(() => JSON.stringify([skills, scenario, roles]), [skills, scenario, roles]);
  sigRef.current = sig;
  const resetInsights = insights.reset;
  useEffect(() => { resetInsights(); setAiSig(''); }, [sig, resetInsights]);

  const recs = useMemo(() => getRecommendedRoles(roles, skills, scenario), [roles, skills, scenario]);
  const selected = getSelectedRecommendation(recs, selectedId);
  const readiness = getJourneyReadiness(recs);
  useEffect(() => {
    if (loading || !roles.length) return;
    setSelectedId((current) => getSelectedRecommendation(recs, current)?.id ?? null);
  }, [recs, loading, roles.length]);
  useEffect(() => {
    if (loading || !roles.length || conflictRef.current) return;
    const generation = ++writeGeneration.current;
    const snapshot: JourneySnapshot = {
        version: 1, skills, scenario, step,
        selectedId: selected?.id ?? null,
        dataset: datasetSnapshot(builtIn, roles),
    };
    if (!navigator.locks) {
      setStorageStatus('Safe device saving is unavailable in this browser. Your edits are only in this tab and will be lost on refresh.');
      return;
    }
    void navigator.locks.request(JOURNEY_STORAGE_KEY, () => {
      if (generation !== writeGeneration.current || conflictRef.current) return;
      const result = commitJourney(window.localStorage, storageBase.current, snapshot);
      if (result.status === 'conflict') { flagConflict(); return; }
      storageBase.current = result.raw;
      setStorageStatus(result.status === 'saved' ? 'Saved on this device.' : 'No profile saved on this device yet.');
    }).catch(() => {
      setStorageStatus('Not saved on this device. Storage may be blocked, full, or this dataset may be too large. Changes may be lost on refresh.');
    });
    return () => { writeGeneration.current++; };
  }, [skills, scenario, step, selected?.id, builtIn, roles, loading, saveRequest]);

  const addSkills = (current: string[], raw: string) => {
    const v = raw.trim();
    if (!v || current.some((s) => normalizeSkill(s) === normalizeSkill(v))) return current;
    return [...current, v];
  };
  const addSkill = () => { setSkills((c) => addSkills(c, draft)); setDraft(''); inputRef.current?.focus(); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } };
  const start = () => {
    const next = addSkills(skills, draft);
    if (!next.length) return;
    setSkills(next); setDraft(''); setActiveView('recommendations'); setStep('results');
  };
  const loadCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const request = ++datasetRequest.current;
    try {
      const next = rolesFromCsv(await file.text());
      if (request !== datasetRequest.current) return;
      setRoles(next); setBuiltIn(false); setLoading(false); setCsvError(''); setDatasetError(''); setSelectedId(null);
    }
    catch (err) {
      if (request !== datasetRequest.current) return;
      setLoading(false);
      setCsvError(err instanceof Error ? err.message : 'We could not read that CSV.');
    }
    finally { e.target.value = ''; }
  };
  const applySnapshot = (snapshot: JourneySnapshot) => {
    writeGeneration.current++;
    datasetRequest.current++;
    setSkills(snapshot.skills); setDraft(''); setScenario(snapshot.scenario);
    setSelectedId(snapshot.selectedId); setStep(snapshot.step);
    setCsvError(''); setDatasetError('');
    setBuiltIn(snapshot.dataset.source === 'built-in');
    setRoles(snapshot.dataset.source === 'imported' ? snapshot.dataset.roles : []);
    setLoading(snapshot.dataset.source === 'built-in');
    resetInsights(); setAiSig('');
    if (snapshot.dataset.source === 'built-in') void loadBuiltIn(true);
  };
  const loadSavedProfile = () => {
    if (!window.confirm('Load the latest saved profile? This will discard edits and any unfinished skill in this tab.')) return;
    const latest = restoreJourney(() => window.localStorage);
    if (latest.notice) { setStorageNotice(latest.notice); return; }
    storageBase.current = latest.raw;
    conflictRef.current = false; setStorageConflict(false);
    setStorageNotice('');
    applySnapshot(latest.snapshot);
    setSaveRequest((value) => value + 1);
  };
  const keepThisProfile = () => {
    if (!window.confirm('Replace the saved profile with this tab’s profile? This can recreate a profile cleared in another tab. Any unfinished skill stays in this tab until you add it.')) return;
    try {
      storageBase.current = window.localStorage.getItem(JOURNEY_STORAGE_KEY);
      conflictRef.current = false; setStorageConflict(false);
      setSaveRequest((value) => value + 1);
    } catch { setStorageStatus('Device storage is unavailable. Your edits are only in this tab.'); }
  };
  const clearProfile = async () => {
    if (!window.confirm('Clear the skills, scenario, selected role and imported dataset saved on this device? This cannot be undone.')) return;
    try {
      if (!navigator.locks) throw new Error('Safe storage unavailable');
      // Cancel pending autosaves before queuing the clear.
      writeGeneration.current++;
      await navigator.locks.request(JOURNEY_STORAGE_KEY, () => {
        const result = commitJourney(window.localStorage, storageBase.current, emptyJourney(), true);
        if (result.status === 'conflict') { flagConflict(); return; }
        storageBase.current = result.raw;
        conflictRef.current = false; setStorageConflict(false);
        applySnapshot(emptyJourney());
        setStorageNotice(''); setStorageStatus('Saved profile cleared from this device.');
      });
    } catch {
      setStorageStatus('Could not clear the saved profile. Allow device storage in your browser and try again.');
    }
  };
  const exportPlan = () => {
    if (!selected) return;
    const rows = [
      'Your reskilling plan',
      `Scenario: ${scenario === 'moderate' ? 'Moderate AI disruption' : 'Fast AI disruption'}`,
      `Current skills: ${skills.join(', ')}`,
      `Local readiness/fit estimate: ${readiness}%`, '',
      `Selected role: ${selected.title} (${selected.sector}), outlook ${selected.growth}%, fit ${selected.match}%`,
      `Skills you already have: ${selected.matches.join(', ') || 'None yet'}`,
      ...(selected.missing.length ? getResourcePlanLines(selected) : ['No missing skills listed for this role.']),
      `Goal (aspirational target): ${selected.title}`,
      '', 'Role trends are directional, based on the active CSV. Built-in values are illustrative scenario projections, not verified forecasts.',
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/plain' }));
    a.download = 'future-ready-plan.txt'; a.click(); URL.revokeObjectURL(a.href);
  };
  const requestInsights = () => {
    if (!skills.length || !recs.length) return;
    const mine = sigRef.current;
    insights.mutate(
      { data: { skills, scenario, roles: recs.map(({ title, growth, skills: rs, sdgs }) => ({ title, growth, skills: rs, sdgs })) } },
      { onSuccess: () => { if (sigRef.current === mine) setAiSig(mine); } },
    );
  };
  const aiFresh = aiSig === sig;

  return (
    <div className="jr">
      <div className="jr-bg" ref={backgroundRef} aria-hidden="true">
        <img className="jr-bg-image" src={geometricBackground} alt="" />
        <div className="jr-bg-shade" />
        <div className="jr-bg-float" />
      </div>
      <header className="jr-bar">
        <div className="jr-brand"><i aria-hidden="true" /><span>jAIX</span></div>
        {step === 'results' && (
          <div className="jr-strip">
            <div className="jr-read"><b data-testid="text-readiness-score">{readiness}%</b>readiness</div>
          </div>
        )}
      </header>

      <main className={step === 'results' && selected ? 'jr-main jr-main-with-sidebar' : 'jr-main'}>
        {storageConflict && <div className="jr-alert" role="alert" data-testid="alert-storage-conflict">
          <p>Another tab changed or cleared the saved profile. Automatic saving is paused. Your current profile and unfinished edits have not been changed.</p>
          <div className="jr-row">
            <button className="jr-btn" onClick={loadSavedProfile} data-testid="button-load-saved-profile">Load saved profile (discard this tab’s edits)</button>
            <button className="jr-btn" onClick={keepThisProfile} data-testid="button-keep-tab-profile">Replace saved profile with this tab</button>
          </div>
        </div>}
        {(datasetError || csvError) && <div>
          {datasetError && <div className="jr-alert" role="alert" data-testid="text-dataset-error">The built-in trends could not load. <button className="jr-link" onClick={() => void loadBuiltIn()}>Retry</button> or import a CSV. {datasetError}</div>}
          {csvError && <div className="jr-alert" role="alert" data-testid="text-csv-error">{csvError}</div>}
        </div>}

        <AnimatePresence mode="wait" initial={false}>
        {step === 'skills' ? (
          <motion.section key="skills" initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={pane} className="jr-wiz" aria-label="Enter your skills">
            <div className="jr-eyebrow">Step 1 of 2</div>
            <h1>What can you already do?</h1>
            <p className="jr-lede">Add the skills you have today. We will compare three possible roles and show one route forward.</p>
            <div className="jr-add">
              <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder="Type a skill, press Enter" aria-label="Add a skill" data-testid="input-add-skill" />
              <button className="jr-btn" onClick={addSkill} disabled={!draft.trim()} data-testid="button-add-skill"><Plus size={14} />Add</button>
            </div>
            <div className="jr-chips" data-testid="list-current-skills">
              {skills.map((s) => <span className="jr-chip" key={s}>{s}<button aria-label={`Remove ${s}`} data-testid={`button-remove-skill-${s.toLowerCase().replace(/\W+/g, '-')}`} onClick={() => setSkills((c) => c.filter((x) => x !== s))}><X size={12} /></button></span>)}
              {!skills.length && <p className="jr-hint">No skills yet.</p>}
            </div>
            <div className="jr-row">
              <button className="jr-btn go" onClick={start} disabled={(!skills.length && !draft.trim()) || loading || !roles.length} data-testid="button-start-journey">Find my futures<ArrowRight size={16} /></button>
              {!skills.length && !draft.trim() && <button className="jr-btn" onClick={() => setSkills([...STARTER_SKILLS])} data-testid="button-try-sample">Try sample skills</button>}
            </div>
            {loading && <p className="jr-hint" role="status" data-testid="status-dataset-loading" style={{ marginTop: 12 }}>Loading role data...</p>}
          </motion.section>
        ) : (
          <motion.section key="results" initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={pane} ref={setResultsNode} tabIndex={-1} id="panel-journey-results" data-testid="panel-journey-results" aria-label="Your career futures">
            <div className="jr-edit">
              <button className="jr-btn" onClick={() => setStep('skills')} data-testid="button-edit-skills"><ArrowLeft size={14} />Edit skills</button>
              <p className="jr-hint">Step 2 of 2 · Choose a role to explore your route. Readiness is a local fit estimate.</p>
            </div>
            {!selected ? (
              <div className="jr-card jr-empty" data-testid="text-no-recommendations">
                <h2>No viable roles in this scenario</h2>
                <p>{scenario === 'fast' ? 'This dataset has no non-declining roles under Fast AI.' : 'No roles are available for this profile.'} Try another path.</p>
                <div className="jr-row" style={{ justifyContent: 'center' }}>
                  {scenario === 'fast' && <button className="jr-btn" onClick={() => setScenario('moderate')}>Switch to Moderate</button>}
                  <button className="jr-btn" onClick={() => setStep('skills')}>Edit skills</button>
                  <button className="jr-btn" onClick={() => fileRef.current?.click()}>Import CSV</button>
                </div>
              </div>
            ) : (
              <div className="jr-results-shell" data-sidebar-collapsed={sidebarCollapsed}>
                <nav className="jr-sidebar" aria-label="Career plan sections" data-collapsed={sidebarCollapsed}>
                  <div className="jr-sidebar-head">
                    <span className="jr-sidebar-label">Workspace</span>
                    <button
                      type="button"
                      className="jr-sidebar-toggle"
                      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                      aria-expanded={!sidebarCollapsed}
                      aria-controls="career-plan-navigation"
                      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                      onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                      data-testid="button-toggle-sidebar"
                    >
                      {sidebarCollapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  <div className="jr-sidebar-menu" id="career-plan-navigation">
                    {workspaceSections.map(({ id, label, Icon }, index) => (
                      <div className="jr-nav-item" key={id}>
                        {index === 1 && <div className="jr-sidebar-divider" aria-hidden="true" />}
                        <button
                          type="button"
                          className="jr-nav-link"
                          aria-label={label}
                          aria-current={activeView === id ? 'page' : undefined}
                          title={sidebarCollapsed ? label : undefined}
                          onClick={() => setActiveView(id)}
                          data-testid={`link-section-${id}`}
                        >
                          <Icon className="jr-nav-icon" size={17} aria-hidden="true" />
                          <span className="jr-nav-text">{label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="jr-sidebar-note">
                    <span>{roles.length} roles scanned</span>
                    <span>{scenario === 'moderate' ? 'Moderate' : 'Fast'} scenario</span>
                  </div>
                </nav>
                <div className="jr-results-content">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.section
                      key={activeView}
                      id={`section-${activeView}`}
                      data-testid={`section-${activeView}`}
                      className={`jr-workspace-view jr-view-${activeView}`}
                      aria-label={`${workspaceSections.find((section) => section.id === activeView)?.label ?? 'Career'} view`}
                      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                    >
                      {activeView === 'overview' && (
                        <>
                          <div className="jr-overview jr-card">
                            <div>
                              <div className="jr-eyebrow">Your career outlook</div>
                              <h1>{recs.length} {recs.length === 1 ? 'future' : 'futures'} worth exploring.</h1>
                              <p className="jr-hint">A focused snapshot of your skills and the active role signals.</p>
                            </div>
                            <div className="jr-overview-score"><b>{readiness}%</b><span>local readiness</span></div>
                          </div>
                          <div className="jr-overview-stats">
                            <article className="jr-stat-card jr-card"><span>Skills in your profile</span><b>{skills.length}</b><small>Current strengths</small></article>
                            <article className="jr-stat-card jr-card"><span>Roles reviewed</span><b>{roles.length}</b><small>From the active dataset</small></article>
                            <article className="jr-stat-card jr-card"><span>Current scenario</span><b>{scenario === 'moderate' ? 'Moderate' : 'Fast'}</b><small>AI disruption setting</small></article>
                          </div>
                          <div className="jr-overview-actions">
                            <button className="jr-btn go" onClick={() => setActiveView('recommendations')} data-testid="button-open-recommendations">Explore role recommendations<ArrowRight size={15} /></button>
                          </div>
                          <details className="jr-card jr-ai">
                            <summary>Optional AI guidance</summary>
                            <div style={{ marginTop: 12 }}>
                              {insights.isPending ? <p aria-live="polite" data-testid="status-insights-loading">Reading your skills against the role signals...</p>
                                : insights.isError ? <div className="jr-alert" role="alert" data-testid="text-insights-error"><strong>AI-specific error:</strong> {aiError?.status === 503 ? 'OpenRouter is not configured yet. Add OPENROUTER_API_KEY to Project Secrets, then restart the API service.' : aiError?.data?.error ?? 'Personalized guidance is unavailable right now.'} Your local results are unaffected.</div>
                                  : insights.data && aiFresh ? <p data-testid="text-insights-summary">{insights.data.summary}</p>
                                    : <p className="jr-hint" data-testid="text-insights-empty">A written second opinion based on your skills and these roles.</p>}
                              <button className="jr-btn" onClick={requestInsights} disabled={!skills.length || !recs.length || insights.isPending} data-testid="button-generate-insights" style={{ marginTop: 10 }}>
                                {insights.isPending ? <><RefreshCw size={14} />Building</> : <><Sparkles size={14} />{insights.data && aiFresh ? 'Refresh guidance' : 'Get AI guidance'}</>}
                              </button>
                            </div>
                          </details>
                        </>
                      )}
                      {activeView === 'recommendations' && (
                        <section className="jr-recommendations jr-card" aria-labelledby="recommendations-title">
                          <div className="jr-colhead">
                            <div><div className="jr-eyebrow">Choose a direction</div><h2 id="recommendations-title">Recommended roles</h2></div>
                            <span className="jr-hint">{recs.length} role signals</span>
                          </div>
                          <div className="jr-filter-row">
                            <span className="jr-filter-label">AI disruption</span>
                            <div className="jr-tog" role="group" aria-label="Disruption scenario">
                              <button className={scenario === 'moderate' ? 'on' : ''} aria-pressed={scenario === 'moderate'} onClick={() => setScenario('moderate')} data-testid="button-scenario-moderate">Moderate</button>
                              <input type="range" min={0} max={1} step={1} value={scenario === 'fast' ? 1 : 0} onChange={(e) => setScenario(e.target.value === '1' ? 'fast' : 'moderate')} aria-label="AI disruption speed" aria-valuetext={scenario === 'fast' ? 'Fast AI' : 'Moderate AI'} data-testid="slider-scenario" />
                              <button className={scenario === 'fast' ? 'on' : ''} aria-pressed={scenario === 'fast'} onClick={() => setScenario('fast')} data-testid="button-scenario-fast">Fast</button>
                            </div>
                          </div>
                          <RolePicker roles={recs} selectedId={selected.id} onSelect={setSelectedId} />
                          <div
                            className="jr-role-summary jr-card"
                            id="role-details"
                            role="tabpanel"
                            aria-labelledby={`role-tab-${Math.max(0, recs.findIndex((role) => role.id === selected.id))}`}
                            tabIndex={0}
                          >
                            <div><span className="jr-eyebrow">Selected direction</span><h3>{selected.title}</h3></div>
                            <p>{selected.matches.length} skills matched · {selected.missing.length} skills to build · {selected.match}% fit</p>
                            <button className="jr-link-button" onClick={() => setActiveView('route')} data-testid="button-view-selected-route">View this reskilling route <ArrowRight size={14} /></button>
                          </div>
                        </section>
                      )}
                      {activeView === 'route' && (
                        <div className="jr-route-view">
                          <div className="jr-page-heading">
                            <div className="jr-eyebrow">Reskilling route</div>
                            <h2>{selected.title}</h2>
                            <p className="jr-hint">A focused path from your current skills toward this role.</p>
                          </div>
                          <section className="jr-card jr-hero jr-quest" aria-label={`Reskilling route for ${selected.title}`}>
                            <QuestMap role={selected} skills={skills} />
                          </section>
                        </div>
                      )}
                      {activeView === 'skills-sdgs' && (
                        <div className="jr-skills-view">
                          <div className="jr-page-heading">
                            <div className="jr-eyebrow">Skills &amp; SDGs</div>
                            <h2>{selected.title}</h2>
                            <p className="jr-hint">See what already matches, what to build, and the goals this role supports.</p>
                          </div>
                          <div className="jr-detail-side" aria-label="Skills and sustainable development goals">
                            <GapPanel role={selected} skills={skills} />
                            <SdgPanel role={selected} />
                          </div>
                        </div>
                      )}
                    </motion.section>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.section>
        )}
        </AnimatePresence>
      </main>

      <footer className="jr-foot">
        <div className="jr-hint">
          <p role="status" data-testid="status-device-storage">{storageStatus} This saved copy is local to this browser, not an account; it is not synced across devices.</p>
          {storageNotice && <p role="alert" data-testid="text-storage-notice">{storageNotice}</p>}
        </div>
        <p className="jr-hint" data-testid="text-data-disclaimer">{builtIn ? 'Built-in values are illustrative hackathon scenario projections, not verified forecasts.' : 'Showing projections from your imported CSV; verify before relying on them.'} {roles.length} roles loaded.</p>
        <div className="jr-tools">
          <button className="jr-btn" onClick={clearProfile} data-testid="button-clear-profile">Clear saved profile</button>
          <button className="jr-btn" aria-label="Import role trend CSV" onClick={() => fileRef.current?.click()} data-testid="button-import-csv"><FileUp size={14} />Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={loadCsv} hidden aria-label="Import role trend CSV" data-testid="input-role-csv" />
          {!builtIn && <button className="jr-btn" onClick={() => void loadBuiltIn()}>Restore built-in</button>}
          {step === 'results' && <button className="jr-btn" onClick={exportPlan} disabled={!selected} data-testid="button-export-plan"><ArrowDownToLine size={14} />Save plan</button>}
          <button className="jr-health" onClick={() => void health.refetch()} data-testid="status-api-health">
            {health.isLoading ? <><i className="idle" />Checking service</> : health.isError ? <><i className="bad" />Offline, local matching active</> : <><i />Service online</>}
          </button>
        </div>
      </footer>
    </div>
  );
}
