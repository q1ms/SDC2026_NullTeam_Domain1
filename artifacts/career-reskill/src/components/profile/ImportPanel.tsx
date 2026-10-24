import { useMemo, useState } from 'react';
import type { ProfessionalEntry } from '@workspace/api-client-react';
import { AlertTriangle, ClipboardPaste, FileText, X } from 'lucide-react';
import type { CareerProfile } from '../../data/catalog';
import {
  MAX_IMPORT_CHARS,
  MAX_SKILLS,
  SECTION_BY_KEY,
  SECTION_KEYS,
  applyImport,
  importReviewFields,
  parseProfileText,
  parseSkills,
  planImport,
  type ImportResult,
  type ImportSummary,
  type ScalarKey,
  type SectionKey,
} from '../../data/professional-profile';
import { SectionEditor } from './SectionEditor';

type Stage = 'idle' | 'paste' | 'review' | 'confirm';

const EXAMPLE = `Headline: Computer science student exploring data roles
Location: Kuala Lumpur, Malaysia

Experience
Teaching Assistant
Universiti Malaya \u00b7 Part-time
Feb 2024 - Present
- Ran weekly tutorials for 40 first-year students
Skills: Python, Public speaking

Education
School: Universiti Malaya
Degree: BSc Computer Science
Dates: 2022 - 2026
Coursework: Databases, Statistics

Projects
Title: jAIX
Dates: Jan 2026 - Feb 2026
Technologies: React, Node.js, Replit
Role: Frontend lead
https://github.com/you/jaix

Languages
English - Native
Bahasa Malaysia (Professional working)`;

export function ImportPanel({ profile, skills, locked, onApply }: {
  profile: CareerProfile;
  skills: string[];
  locked: boolean;
  onApply: (next: CareerProfile, nextSkills: string[], summary: ImportSummary) => void;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const [replaceFields, setReplaceFields] = useState<string[]>([]);
  const [mergeSections, setMergeSections] = useState<string[]>([]);
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);
  const over = text.length > MAX_IMPORT_CHARS;

  const preview = useMemo<ImportResult | null>(() => result && { ...result, skills: parseSkills(skillsText) }, [result, skillsText]);
  const plan = useMemo(() => preview ? planImport(profile, skills, preview) : null, [preview, profile, skills]);
  const reviewFields = useMemo(() => preview ? importReviewFields(profile, skills, preview) : [], [preview, profile, skills]);
  const dryRun = useMemo(() => preview ? applyImport(profile, skills, preview, { replaceFields, mergeSections }) : null, [preview, profile, skills, replaceFields, mergeSections]);

  const reset = () => { setStage('idle'); setResult(null); setReplaceFields([]); setMergeSections([]); setSkillsText(''); };
  const toggle = (list: string[], set: (v: string[]) => void, key: string) => set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  const parse = () => {
    const parsed = parseProfileText(text);
    if (parsed.error) { setResult(parsed); return; }
    setResult(parsed);
    setSkillsText(parsed.skills.join(', '));
    setReplaceFields([]);
    setMergeSections([]);
    setLastSummary(null);
    setStage('review');
  };
  const updateScalar = (key: ScalarKey, value: string) => setResult((r) => r && { ...r, scalars: { ...r.scalars, [key]: value } });
  const updateSection = (key: SectionKey, entries: ProfessionalEntry[]) => setResult((r) => r && { ...r, sections: { ...r.sections, [key]: entries } });
  const confirm = () => {
    if (locked || !dryRun) return;
    onApply(dryRun.profile, dryRun.skills, dryRun.summary);
    setLastSummary(dryRun.summary);
    setText('');
    reset();
  };

  if (stage === 'idle') {
    return (
      <div className="pi-import-idle" data-testid="panel-import-idle">
        <div className="pi-import-icon"><ClipboardPaste size={17} aria-hidden="true" /></div>
        <div>
          <strong>Paste your own profile text</strong>
          <p>Copy sections from your CV or LinkedIn page and review what we recognise before anything reaches your draft. Nothing is fetched from LinkedIn and no account is connected.</p>
          {lastSummary && (
            <p className="pi-import-done" role="status" data-testid="status-import-applied">
              Added to your draft: {lastSummary.filled.length + lastSummary.replaced.length} field(s), {lastSummary.addedRecords} record(s), {lastSummary.addedSkills} skill(s)
              {lastSummary.duplicateRecords + lastSummary.duplicateSkills > 0 ? `; ${lastSummary.duplicateRecords + lastSummary.duplicateSkills} duplicate(s) skipped` : ''}. Save to keep it.
            </p>
          )}
        </div>
        <button type="button" className="button-quiet" onClick={() => setStage('paste')} data-testid="button-open-import">Start import</button>
      </div>
    );
  }

  return (
    <div className="pi-import" data-testid="panel-import">
      <div className="pi-import-top">
        <ol className="pi-steps" aria-label="Import progress">
          {(['paste', 'review', 'confirm'] as const).map((s, i) => (
            <li key={s} className={stage === s ? 'is-current' : ''} aria-current={stage === s ? 'step' : undefined}>
              <span>{i + 1}</span>{s === 'paste' ? 'Paste' : s === 'review' ? 'Review and edit' : 'Confirm'}
            </li>
          ))}
        </ol>
        <button type="button" className="pi-icon-button" onClick={reset} aria-label="Cancel import" data-testid="button-cancel-import-x"><X size={15} /></button>
      </div>

      {stage === 'paste' && (
        <>
          <label htmlFor="import-text" className="pi-label">Profile text</label>
          <textarea id="import-text" className="textarea-control pi-import-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} data-testid="input-import-text" />
          <div className="pi-import-meta">
            <span className={over ? 'pi-over' : ''} data-testid="text-import-count">{text.length.toLocaleString()} / {MAX_IMPORT_CHARS.toLocaleString()} characters</span>
          </div>
          {result?.error && <div className="form-errors" role="alert" data-testid="status-import-error">{result.error}</div>}
          <details className="pi-format">
            <summary>Supported format</summary>
            <p>Headings on their own line: About, Experience, Volunteer experience, Organizations, Education, Licenses &amp; certifications, Courses, Projects, Honors &amp; awards, Publications, Languages, Test scores, Skills. Separate records with a blank line. Copied LinkedIn lines like "Jun 2024 - Present" and "Issued by" are recognised, and labelled lines such as "Degree:", "Dates:", "Technologies:" or "Score:" are matched exactly. Top-level labels: Name, Headline, Location, Industry, Target industry, Current role, LinkedIn.</p>
            <pre>{EXAMPLE}</pre>
          </details>
          <div className="pi-import-actions">
            <button type="button" className="button-quiet" onClick={reset} data-testid="button-cancel-import">Cancel</button>
            <button type="button" className="button-primary" onClick={parse} disabled={!text.trim() || over} data-testid="button-parse-import">
              <FileText size={14} aria-hidden="true" /> Read text
            </button>
          </div>
        </>
      )}

      {stage === 'review' && result && plan && (
        <>
          <p className="pi-note">This is a preview. Edit anything below; nothing changes in your draft until you confirm. Missing facts are flagged, never guessed.</p>
          {result.warnings.length > 0 && (
            <ul className="pi-warnings" role="status" data-testid="status-import-warnings">
              {result.warnings.map((w) => <li key={w}><AlertTriangle size={12} aria-hidden="true" />{w}</li>)}
            </ul>
          )}
          {reviewFields.length > 0 && (
            <div className="pi-review-group">
              <h4>Profile fields</h4>
              {reviewFields.map((item) => (
                <div className="pi-review-field" key={item.key}>
                  <label htmlFor={`import-scalar-${item.key}`}>{item.label}<span className={`pi-badge ${item.status}`}>{!item.incoming.trim() ? 'Left blank — not applied' : item.status === 'fill' ? 'Fills blank' : item.status === 'same' ? 'Already matches' : 'Differs from draft'}</span></label>
                  {item.key === 'about'
                    ? <textarea id={`import-scalar-${item.key}`} className="textarea-control pi-textarea-sm" value={result.scalars[item.key] ?? ''} onChange={(e) => updateScalar(item.key, e.target.value)} data-testid={`input-import-${item.key}`} />
                    : <input id={`import-scalar-${item.key}`} className="input-control" value={result.scalars[item.key] ?? ''} onChange={(e) => updateScalar(item.key, e.target.value)} data-testid={`input-import-${item.key}`} />}
                  {item.status === 'conflict' && (
                    <label className="pi-check">
                      <input type="checkbox" checked={replaceFields.includes(item.key)} onChange={() => toggle(replaceFields, setReplaceFields, item.key)} data-testid={`checkbox-replace-${item.key}`} />
                      <span>Replace current value "{item.current.length > 80 ? `${item.current.slice(0, 80)}\u2026` : item.current}"</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
          {(result.skills.length > 0 || skillsText) && (
            <div className="pi-review-group">
              <h4>Skills</h4>
              <label htmlFor="import-skills" className="pi-label">Comma separated <span className="field-hint">{parseSkills(skillsText).length} / {MAX_SKILLS}</span></label>
              <textarea id="import-skills" className="textarea-control pi-textarea-sm" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} data-testid="input-import-skills" />
              {skills.length > 0 && (
                <label className="pi-check">
                  <input type="checkbox" checked={mergeSections.includes('skills')} onChange={() => toggle(mergeSections, setMergeSections, 'skills')} data-testid="checkbox-merge-skills" />
                  <span>Merge into your {skills.length} existing skills (duplicates skipped)</span>
                </label>
              )}
            </div>
          )}
          {SECTION_KEYS.filter((key) => result.sections[key]?.length).map((key) => {
            const existing = (profile.professionalBackground?.[key] ?? []).length;
            return (
              <SectionEditor
                key={key}
                section={SECTION_BY_KEY[key]}
                entries={result.sections[key] ?? []}
                onChange={(next) => updateSection(key, next)}
                idPrefix="import"
                warnings={result.entryWarnings}
                defaultOpen
                headerExtra={existing > 0 ? (
                  <label className="pi-check pi-merge">
                    <input type="checkbox" checked={mergeSections.includes(key)} onChange={() => toggle(mergeSections, setMergeSections, key)} data-testid={`checkbox-merge-${key}`} />
                    <span>Add these to your {existing} existing {SECTION_BY_KEY[key].label.toLowerCase()} entries (matching entries skipped)</span>
                  </label>
                ) : undefined}
              />
            );
          })}
          {result.unclassified.length > 0 && (
            <div className="pi-review-group">
              <h4>Not classified ({result.unclassified.length})</h4>
              <p className="pi-note">Copy anything useful into the right field yourself. This text will not be applied.</p>
              <pre className="pi-raw" data-testid="text-import-unclassified">{result.unclassified.join('\n')}</pre>
            </div>
          )}
          <details className="pi-format">
            <summary>Original pasted text</summary>
            <pre className="pi-raw" data-testid="text-import-original">{text}</pre>
          </details>
          <div className="pi-import-actions">
            <button type="button" className="button-quiet" onClick={reset} data-testid="button-cancel-import">Cancel</button>
            <button type="button" className="button-quiet" onClick={() => setStage('paste')} data-testid="button-back-import">Back to text</button>
            <button type="button" className="button-primary" onClick={() => setStage('confirm')} data-testid="button-review-import">Review changes</button>
          </div>
        </>
      )}

      {stage === 'confirm' && dryRun && (
        <>
          <ul className="pi-summary" data-testid="list-import-summary">
            <li><strong>{dryRun.summary.filled.length}</strong> blank field(s) filled{dryRun.summary.filled.length ? `: ${dryRun.summary.filled.join(', ')}` : ''}</li>
            <li><strong>{dryRun.summary.replaced.length}</strong> field(s) replaced{dryRun.summary.replaced.length ? `: ${dryRun.summary.replaced.join(', ')}` : ''}</li>
            {dryRun.summary.keptFields.length > 0 && <li>Kept your current {dryRun.summary.keptFields.join(', ')}</li>}
            <li><strong>{dryRun.summary.addedRecords}</strong> record(s) added, {dryRun.summary.duplicateRecords} duplicate(s) skipped</li>
            <li><strong>{dryRun.summary.addedSkills}</strong> skill(s) added, {dryRun.summary.duplicateSkills} already present</li>
            {dryRun.summary.skippedSections.length > 0 && <li>Not merged (box unchecked): {dryRun.summary.skippedSections.join(', ')}</li>}
            {dryRun.skills.length > MAX_SKILLS && <li className="pi-over">You will have {dryRun.skills.length} skills. Remove {dryRun.skills.length - MAX_SKILLS} before saving.</li>}
          </ul>
          <p className="pi-note">Nothing is removed. Changes go into your draft only; your saved profile updates when you save.</p>
          <div className="pi-import-actions">
            <button type="button" className="button-quiet" onClick={reset} data-testid="button-cancel-import">Cancel</button>
            <button type="button" className="button-quiet" onClick={() => setStage('review')} data-testid="button-back-review">Back</button>
            <button type="button" className="button-primary" onClick={confirm} disabled={locked} data-testid="button-confirm-import">Apply to draft</button>
          </div>
        </>
      )}
    </div>
  );
}
