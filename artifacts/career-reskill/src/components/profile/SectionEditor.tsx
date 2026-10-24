import { useEffect, useState, type ReactNode } from 'react';
import type { ProfessionalEntry } from '@workspace/api-client-react';
import { AlertTriangle, Check, ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  MAX_ENTRIES,
  formatDateRange,
  isDateOrderValid,
  isValidDate,
  safeExternalUrl,
  splitListText,
  makeEntryId,
  type EntryField,
  type SectionDef,
} from '../../data/professional-profile';

function ListField({ id, value, kind, placeholder, onChange }: { id: string; value: string[]; kind: 'lines' | 'tags'; placeholder?: string; onChange: (next: string[]) => void }) {
  const joiner = kind === 'tags' ? ', ' : '\n';
  const [text, setText] = useState(value.join(joiner));
  const valueKey = value.join('\u0000');
  useEffect(() => {
    setText((current) => splitListText(current, kind).join('\u0000') === valueKey ? current : value.join(joiner));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);
  const Tag = kind === 'tags' ? 'input' : 'textarea';
  return (
    <Tag
      id={id}
      className={kind === 'tags' ? 'input-control' : 'textarea-control pi-textarea-sm'}
      value={text}
      placeholder={placeholder}
      onChange={(event) => { setText(event.target.value); onChange(splitListText(event.target.value, kind)); }}
      data-testid={`input-${id}`}
    />
  );
}

function FieldControl({ field, entry, id, onPatch }: { field: EntryField; entry: ProfessionalEntry; id: string; onPatch: (patch: Partial<ProfessionalEntry>) => void }) {
  const rec = entry as unknown as Record<string, unknown>;
  if (field.kind === 'lines' || field.kind === 'tags') {
    const list = (rec[field.key] as string[] | undefined) ?? [];
    return <ListField id={id} value={list} kind={field.kind} placeholder={field.placeholder} onChange={(next) => onPatch({ [field.key]: next } as Partial<ProfessionalEntry>)} />;
  }
  const value = String(rec[field.key] ?? '');
  const set = (v: string) => onPatch({ [field.key]: v } as Partial<ProfessionalEntry>);
  if (field.kind === 'textarea') {
    return <textarea id={id} className="textarea-control pi-textarea-sm" value={value} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} data-testid={`input-${id}`} />;
  }
  return (
    <input
      id={id}
      className="input-control"
      value={value}
      inputMode={field.kind === 'date' ? 'numeric' : field.kind === 'url' ? 'url' : undefined}
      type={field.kind === 'url' ? 'url' : 'text'}
      placeholder={field.placeholder}
      onChange={(e) => set(e.target.value)}
      data-testid={`input-${id}`}
    />
  );
}

function fieldProblem(field: EntryField, entry: ProfessionalEntry): string | null {
  const rec = entry as unknown as Record<string, unknown>;
  const raw = rec[field.key];
  if (Array.isArray(raw)) {
    if (raw.length > 50) return `${raw.length} items; limit is 50.`;
    return null;
  }
  const v = String(raw ?? '').trim();
  if (!v) return null;
  if (v.length > field.max) return `${v.length}/${field.max} characters.`;
  if (field.kind === 'date' && !isValidDate(v)) return 'Use a real YYYY, YYYY-MM or YYYY-MM-DD date.';
  if (field.key === 'endDate' && !isDateOrderValid(entry.startDate?.trim(), v)) return 'Ends before it starts.';
  if (field.kind === 'url' && !safeExternalUrl(v)) return 'Must start with http:// or https://.';
  return null;
}

function EntryRow({ section, entry, index, editing, onEdit, onPatch, onRemove, idPrefix, warnings }: {
  section: SectionDef; entry: ProfessionalEntry; index: number; editing: boolean; idPrefix: string; warnings?: string[];
  onEdit: (open: boolean) => void; onPatch: (patch: Partial<ProfessionalEntry>) => void; onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const base = `${idPrefix}-${section.key}-${index}`;
  const dates = formatDateRange(entry);
  const sub = entry.organization || entry.degree || entry.contribution || entry.proficiency || entry.score;
  const links = [entry.url, entry.secondaryUrl].map(safeExternalUrl).filter((v): v is string => Boolean(v));
  return (
    <li className={`pi-entry ${editing ? 'is-editing' : ''}`} data-testid={`card-${base}`}>
      <div className="pi-entry-head">
        <div className="pi-entry-summary">
          <strong data-testid={`text-${base}-title`}>{entry.title?.trim() || <span className="pi-muted">Untitled {section.singular}</span>}</strong>
          {(sub || dates) && <span>{[sub, dates].filter(Boolean).join(' \u00b7 ')}</span>}
          {!editing && links.map((href) => (
            <a key={href} className="pi-link" href={href} target="_blank" rel="noopener noreferrer" data-testid={`link-${base}`}>
              {new URL(href).hostname}<ExternalLink size={11} aria-hidden="true" />
            </a>
          ))}
        </div>
        <div className="pi-entry-actions">
          {confirming ? (
            <>
              <span className="pi-confirm-text">Remove?</span>
              <button type="button" className="pi-chip-button danger" onClick={() => { setConfirming(false); onRemove(); }} data-testid={`button-${base}-confirm-remove`}>Remove</button>
              <button type="button" className="pi-chip-button" onClick={() => setConfirming(false)} data-testid={`button-${base}-cancel-remove`}>Keep</button>
            </>
          ) : (
            <>
              <button type="button" className="pi-chip-button" onClick={() => onEdit(!editing)} aria-expanded={editing} aria-controls={`${base}-editor`} data-testid={`button-${base}-edit`}>
                {editing ? <><Check size={12} aria-hidden="true" /> Done</> : <><Pencil size={12} aria-hidden="true" /> Edit</>}
              </button>
              <button type="button" className="pi-chip-button" onClick={() => setConfirming(true)} aria-label={`Remove ${entry.title || section.singular}`} data-testid={`button-${base}-remove`}>
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      {warnings && warnings.length > 0 && (
        <ul className="pi-entry-warnings" data-testid={`status-${base}-warnings`}>
          {warnings.map((w) => <li key={w}><AlertTriangle size={11} aria-hidden="true" />{w}</li>)}
        </ul>
      )}
      {editing && (
        <div id={`${base}-editor`} className="pi-entry-editor">
          {section.fields.map((field) => {
            if (field.key === 'endDate' && entry.current) return null;
            const id = `${base}-${field.key}`;
            const problem = fieldProblem(field, entry);
            return (
              <div key={field.key} className={`field ${field.wide ? 'pi-wide' : ''}`}>
                <label htmlFor={id}>{field.label}{field.key === 'title' ? <span className="field-hint">Required</span> : field.hint ? <span className="field-hint">{field.hint}</span> : null}</label>
                <FieldControl field={field} entry={entry} id={id} onPatch={onPatch} />
                {problem && <p className="pi-field-error" role="alert">{problem}</p>}
              </div>
            );
          })}
          {section.hasCurrent && (
            <label className="pi-check pi-wide">
              <input type="checkbox" checked={Boolean(entry.current)} onChange={(e) => onPatch({ current: e.target.checked })} data-testid={`checkbox-${base}-current`} />
              <span>{section.currentLabel ?? 'Current'}</span>
              {entry.current && entry.endDate && <span className="field-hint">End date is ignored while this is checked.</span>}
            </label>
          )}
        </div>
      )}
    </li>
  );
}

export function SectionEditor({ section, entries, onChange, idPrefix, warnings, defaultOpen = false, headerExtra }: {
  section: SectionDef;
  entries: ProfessionalEntry[];
  onChange: (next: ProfessionalEntry[]) => void;
  idPrefix: string;
  warnings?: Record<string, string[]>;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panelId = `${idPrefix}-${section.key}-panel`;
  const headId = `${idPrefix}-${section.key}-head`;
  const full = entries.length >= MAX_ENTRIES;
  const add = () => {
    if (full) return;
    const entry: ProfessionalEntry = { id: makeEntryId(), title: '' };
    onChange([...entries, entry]);
    setEditingId(entry.id);
    setOpen(true);
  };
  return (
    <section className={`pi-section ${open ? 'is-open' : ''}`} data-testid={`section-${idPrefix}-${section.key}`}>
      <h3 className="pi-section-heading">
        <button type="button" id={headId} className="pi-section-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} data-testid={`button-toggle-${idPrefix}-${section.key}`}>
          <span className="pi-section-name">{section.label}</span>
          <span className="pi-section-blurb">{section.blurb}</span>
          <span className={`pi-count ${entries.length ? 'has-items' : ''}`} key={entries.length} data-testid={`text-count-${idPrefix}-${section.key}`}>{entries.length}</span>
          <ChevronDown size={15} className="pi-chevron" aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={headId} hidden={!open} className="pi-section-body">
        {headerExtra}
        {entries.length === 0 ? (
          <p className="pi-empty">Nothing here yet. This section is optional.</p>
        ) : (
          <ol className="pi-entry-list">
            {entries.map((entry, index) => (
              <EntryRow
                key={entry.id}
                section={section}
                entry={entry}
                index={index}
                idPrefix={idPrefix}
                warnings={warnings?.[entry.id]}
                editing={editingId === entry.id}
                onEdit={(o) => setEditingId(o ? entry.id : null)}
                onPatch={(patch) => onChange(entries.map((e) => e.id === entry.id ? { ...e, ...patch } : e))}
                onRemove={() => onChange(entries.filter((e) => e.id !== entry.id))}
              />
            ))}
          </ol>
        )}
        <div className="pi-section-foot">
          <button type="button" className="pi-add" onClick={add} disabled={full} data-testid={`button-add-${idPrefix}-${section.key}`}>
            <Plus size={13} aria-hidden="true" /> Add {section.singular}
          </button>
          <span className="field-hint">{full ? `Limit of ${MAX_ENTRIES} reached. Remove one to add another.` : `${entries.length} of ${MAX_ENTRIES}`}</span>
        </div>
      </div>
    </section>
  );
}
