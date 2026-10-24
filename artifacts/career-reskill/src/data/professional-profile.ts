import type { ProfessionalBackground, ProfessionalEntry } from '@workspace/api-client-react';
import type { CareerProfile } from './catalog.ts';

export const MAX_ENTRIES = 30;
export const MAX_SKILLS = 50;
export const MAX_LIST_ITEMS = 50;
export const MAX_IMPORT_CHARS = 30000;

export const SECTION_KEYS = [
  'experience', 'volunteering', 'organizations', 'education', 'certifications', 'courses',
  'projects', 'awards', 'publications', 'languages', 'testScores',
] as const;
export type SectionKey = typeof SECTION_KEYS[number];

export type EntryTextKey = 'title' | 'organization' | 'startDate' | 'endDate' | 'description' | 'degree' | 'gpa'
  | 'contribution' | 'url' | 'secondaryUrl' | 'proficiency' | 'score';
export type EntryListKey = 'achievements' | 'coursework' | 'technologies' | 'skills';
export type FieldKind = 'text' | 'textarea' | 'date' | 'lines' | 'tags' | 'url';
export type EntryField = { key: EntryTextKey | EntryListKey; label: string; kind: FieldKind; max: number; placeholder?: string; hint?: string; wide?: boolean };
export type SectionDef = { key: SectionKey; label: string; singular: string; blurb: string; hasCurrent: boolean; currentLabel?: string; fields: EntryField[] };

const TEXT_MAX: Record<EntryTextKey, number> = {
  title: 300, organization: 300, startDate: 10, endDate: 10, description: 5000, degree: 300, gpa: 50,
  contribution: 3000, url: 2000, secondaryUrl: 2000, proficiency: 100, score: 100,
};
const LIST_ITEM_MAX: Record<EntryListKey, number> = { achievements: 1000, coursework: 200, technologies: 200, skills: 200 };
export const TEXT_KEYS = Object.keys(TEXT_MAX) as EntryTextKey[];
export const LIST_KEYS = Object.keys(LIST_ITEM_MAX) as EntryListKey[];

const f = (key: EntryTextKey | EntryListKey, label: string, kind: FieldKind, extra: Partial<EntryField> = {}): EntryField => ({
  key, label, kind, max: (TEXT_MAX as Record<string, number>)[key] ?? (LIST_ITEM_MAX as Record<string, number>)[key], ...extra,
});
const start = (label = 'Start') => f('startDate', label, 'date', { placeholder: 'YYYY-MM' });
const end = (label = 'End') => f('endDate', label, 'date', { placeholder: 'YYYY-MM' });
const tagSkills = f('skills', 'Skills used', 'tags', { placeholder: 'SQL, stakeholder interviews', hint: 'Comma separated. Counts toward matching.', wide: true });

export const SECTIONS: SectionDef[] = [
  { key: 'experience', label: 'Experience', singular: 'experience', blurb: 'Jobs, internships, freelance, part-time and campus work.', hasCurrent: true, currentLabel: 'I currently work here', fields: [
    f('title', 'Role', 'text', { placeholder: 'e.g. Teaching assistant' }), f('organization', 'Organization', 'text', { placeholder: 'e.g. Universiti Malaya' }),
    start(), end(), f('description', 'Description', 'textarea', { wide: true }),
    f('achievements', 'Achievement bullets', 'lines', { placeholder: 'One per line', hint: 'One per line. Narrative only, not scored.', wide: true }), tagSkills] },
  { key: 'volunteering', label: 'Volunteering', singular: 'volunteer role', blurb: 'Causes, community service and event help.', hasCurrent: true, currentLabel: 'Ongoing', fields: [
    f('title', 'Role', 'text'), f('organization', 'Organization or cause', 'text'), start(), end(),
    f('description', 'Description', 'textarea', { wide: true }), f('achievements', 'Highlights', 'lines', { placeholder: 'One per line', wide: true }), tagSkills] },
  { key: 'organizations', label: 'Organizations', singular: 'organization', blurb: 'Clubs, societies and memberships.', hasCurrent: true, currentLabel: 'Current member', fields: [
    f('title', 'Organization', 'text', { placeholder: 'e.g. Computer Science Society' }), f('contribution', 'Position', 'text', { placeholder: 'e.g. Committee member' }),
    start(), end(), f('description', 'Activities', 'textarea', { wide: true })] },
  { key: 'education', label: 'Education', singular: 'education record', blurb: 'Institution, degree, dates or expected graduation.', hasCurrent: true, currentLabel: 'Currently studying', fields: [
    f('title', 'Institution', 'text'), f('degree', 'Degree and field', 'text', { placeholder: 'e.g. BSc Computer Science' }),
    start(), end('End or expected graduation'), f('gpa', 'GPA', 'text', { hint: 'Optional. Never used for ranking.' }),
    f('coursework', 'Relevant coursework', 'tags', { placeholder: 'Databases, Statistics', hint: 'Comma separated. Counts toward matching.', wide: true }),
    f('description', 'Notes', 'textarea', { wide: true })] },
  { key: 'certifications', label: 'Licenses & certifications', singular: 'certification', blurb: 'Professional certificates you have earned.', hasCurrent: false, fields: [
    f('title', 'Certification name', 'text'), f('organization', 'Issuer', 'text'), start('Issued'), end('Expires'),
    f('url', 'Credential link', 'url', { placeholder: 'https://', wide: true }), tagSkills] },
  { key: 'courses', label: 'Courses', singular: 'course', blurb: 'Specific courses relevant to your direction.', hasCurrent: false, fields: [
    f('title', 'Course name', 'text'), f('organization', 'Provider', 'text'), end('Completed'),
    f('url', 'Course or certificate link', 'url', { placeholder: 'https://' }), f('description', 'Description', 'textarea', { wide: true }), tagSkills] },
  { key: 'projects', label: 'Projects', singular: 'project', blurb: 'What you built, the stack and your part in it.', hasCurrent: true, currentLabel: 'In progress', fields: [
    f('title', 'Project title', 'text'), f('contribution', 'Your role and contribution', 'text'), start(), end(),
    f('description', 'What you built', 'textarea', { wide: true }),
    f('technologies', 'Technologies', 'tags', { placeholder: 'React, Node.js', hint: 'Comma separated. Counts toward matching.', wide: true }),
    f('url', 'Repository link', 'url', { placeholder: 'https://github.com/...' }), f('secondaryUrl', 'Live link', 'url', { placeholder: 'https://' })] },
  { key: 'awards', label: 'Honors & awards', singular: 'award', blurb: 'Hackathon placings, scholarships, dean\u2019s list.', hasCurrent: false, fields: [
    f('title', 'Award', 'text'), f('organization', 'Issuer', 'text'), end('Date'), f('description', 'Description', 'textarea', { wide: true })] },
  { key: 'publications', label: 'Publications', singular: 'publication', blurb: 'Papers and articles you wrote.', hasCurrent: false, fields: [
    f('title', 'Title', 'text'), f('organization', 'Publisher', 'text'), end('Published'), f('url', 'Link', 'url', { placeholder: 'https://' }),
    f('description', 'Description', 'textarea', { wide: true })] },
  { key: 'languages', label: 'Languages', singular: 'language', blurb: 'Languages you speak and how well.', hasCurrent: false, fields: [
    f('title', 'Language', 'text'), f('proficiency', 'Proficiency', 'text', { placeholder: 'e.g. Professional working' })] },
  { key: 'testScores', label: 'Test scores', singular: 'test score', blurb: 'IELTS, TOEFL, SAT and similar. Never used for ranking.', hasCurrent: false, fields: [
    f('title', 'Test', 'text'), f('score', 'Score', 'text'), end('Date'), f('description', 'Notes', 'textarea', { wide: true })] },
];
export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s])) as Record<SectionKey, SectionDef>;

export const SCALAR_KEYS = ['currentRole', 'industry', 'displayName', 'headline', 'about', 'location', 'targetIndustry', 'linkedinUrl'] as const;
export type ScalarKey = typeof SCALAR_KEYS[number];
export const SCALAR_LABELS: Record<ScalarKey, string> = {
  currentRole: 'Current role or status', industry: 'Current industry', displayName: 'Display name', headline: 'Professional headline',
  about: 'About', location: 'Location', targetIndustry: 'Target industry', linkedinUrl: 'LinkedIn profile URL',
};
const BG_SCALAR_MAX: Record<string, number> = { displayName: 200, headline: 300, about: 5000, location: 300, targetIndustry: 300, linkedinUrl: 2000 };

let idCounter = 0;
export function makeEntryId(): string {
  idCounter += 1;
  return `e${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- small helpers ---------- */
const norm = (value: string | undefined) => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function parseSkills(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const skill = raw.trim();
    if (!skill || seen.has(skill.toLowerCase())) continue;
    seen.add(skill.toLowerCase());
    out.push(skill);
  }
  return out;
}

export function splitListText(text: string, kind: 'lines' | 'tags'): string[] {
  const parts = kind === 'tags' ? text.split(/[,\n]/) : text.split('\n');
  return parts.map((p) => p.replace(/^\s*(?:[-*\u2022\u00b7]\s+)?/, '').trim()).filter(Boolean);
}

export function isValidDate(value: string): boolean {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  if (year < 1900 || year > 2100) return false;
  if (m[2] === undefined) return true;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return false;
  if (m[3] === undefined) return true;
  const day = Number(m[3]);
  return day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateBound(value: string, high: boolean): string {
  const [y, m, d] = value.split('-');
  const month = m ?? (high ? '12' : '01');
  const day = d ?? (high ? String(new Date(Date.UTC(Number(y), Number(month), 0)).getUTCDate()).padStart(2, '0') : '01');
  return `${y}-${month}-${day}`;
}

export function isDateOrderValid(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) return true;
  return dateBound(startDate, false) <= dateBound(endDate, true);
}

export function safeExternalUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isLinkedInProfileUrl(value: string): boolean {
  const safe = safeExternalUrl(value);
  if (!safe) return false;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return false;
  return /^\/in\/[^/]+\/?$/.test(url.pathname);
}

export function formatDateRange(entry: ProfessionalEntry): string {
  const s = entry.startDate?.trim();
  const e = entry.current ? 'Present' : entry.endDate?.trim();
  if (s && e) return `${s} \u2013 ${e}`;
  return s ? `From ${s}` : e ?? '';
}

/* ---------- normalization ---------- */
function isEntryBlank(entry: ProfessionalEntry): boolean {
  const rec = entry as unknown as Record<string, unknown>;
  return TEXT_KEYS.every((k) => !String(rec[k] ?? '').trim())
    && LIST_KEYS.every((k) => !((rec[k] as string[] | undefined) ?? []).some((v) => v.trim()))
    && !entry.current;
}

export function cleanEntry(entry: ProfessionalEntry): ProfessionalEntry {
  const out: Record<string, unknown> = { id: entry.id, title: (entry.title ?? '').trim() };
  const rec = entry as unknown as Record<string, unknown>;
  for (const key of TEXT_KEYS) {
    if (key === 'title') continue;
    const v = typeof rec[key] === 'string' ? (rec[key] as string).trim() : '';
    if (v) out[key] = v;
  }
  for (const key of LIST_KEYS) {
    const list = ((rec[key] as string[] | undefined) ?? []).map((v) => v.trim()).filter(Boolean);
    if (list.length) out[key] = list;
  }
  if (entry.current) out.current = true;
  return out as unknown as ProfessionalEntry;
}

export function cleanBackground(bg: ProfessionalBackground | undefined): ProfessionalBackground {
  const out: Record<string, unknown> = {};
  const src = (bg ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(BG_SCALAR_MAX)) {
    const v = typeof src[key] === 'string' ? (src[key] as string).trim() : '';
    if (v) out[key] = v;
  }
  for (const key of SECTION_KEYS) {
    const entries = ((src[key] as ProfessionalEntry[] | undefined) ?? []).filter((e) => !isEntryBlank(e)).map(cleanEntry);
    out[key] = entries;
  }
  return out as ProfessionalBackground;
}

/* ---------- validation ---------- */
export type ValidationTarget = {
  controlId: string;
  detailedOnly?: boolean;
  section?: SectionKey;
  entryId?: string;
};
export type ProfileIssue = { id: string; message: string; target: ValidationTarget };
export type ErrorFocusRequest = ValidationTarget & { requestId: number };

export function entryControlId(prefix: string, section: SectionKey, entryId: string, field: string): string {
  return `${prefix}-${section}-entry-${encodeURIComponent(entryId)}-${field}`;
}

export function issueAttributes(issues: ProfileIssue[], controlId: string) {
  const ids = issues.filter((issue) => issue.target.controlId === controlId).map((issue) => issue.id);
  return {
    'aria-invalid': ids.length ? true as const : undefined,
    'aria-describedby': ids.length ? ids.join(' ') : undefined,
  };
}

export function validateEntryIssues(section: SectionDef, entry: ProfessionalEntry, index: number): ProfileIssue[] {
  const where = `${section.label} #${index + 1}${entry.title?.trim() ? ` (${entry.title.trim()})` : ''}`;
  const issues: ProfileIssue[] = [];
  const add = (field: string, message: string) => {
    const controlId = entryControlId('profile', section.key, entry.id, field);
    issues.push({
      id: `error-${controlId}-${issues.length}`,
      message,
      target: { controlId, detailedOnly: true, section: section.key, entryId: entry.id },
    });
  };
  const rec = entry as unknown as Record<string, unknown>;
  if (!entry.title?.trim()) add('title', `${where}: add a ${section.fields[0].label.toLowerCase()} or remove the entry.`);
  for (const key of TEXT_KEYS) {
    const v = String(rec[key] ?? '').trim();
    if (v.length > TEXT_MAX[key]) add(key, `${where}: ${key} is ${v.length} characters; shorten it to ${TEXT_MAX[key]}.`);
  }
  for (const key of LIST_KEYS) {
    const list = ((rec[key] as string[] | undefined) ?? []).filter((v) => v.trim());
    if (list.length > MAX_LIST_ITEMS) add(key, `${where}: ${list.length} ${key} items; remove ${list.length - MAX_LIST_ITEMS} (limit ${MAX_LIST_ITEMS}).`);
    const long = list.find((v) => v.trim().length > LIST_ITEM_MAX[key]);
    if (long) add(key, `${where}: a ${key} item is longer than ${LIST_ITEM_MAX[key]} characters.`);
  }
  const s = entry.startDate?.trim();
  const e = entry.current ? '' : entry.endDate?.trim();
  if (s && !isValidDate(s)) add('startDate', `${where}: start date "${s}" must be a real YYYY, YYYY-MM or YYYY-MM-DD date.`);
  if (e && !isValidDate(e)) add('endDate', `${where}: end date "${e}" must be a real YYYY, YYYY-MM or YYYY-MM-DD date.`);
  if (s && e && !isDateOrderValid(s, e)) add('endDate', `${where}: end date is before the start date.`);
  for (const key of ['url', 'secondaryUrl'] as const) {
    const v = entry[key]?.trim();
    if (v && !safeExternalUrl(v)) add(key, `${where}: links must start with http:// or https://.`);
  }
  return issues;
}

export function validateEntry(section: SectionDef, entry: ProfessionalEntry, index: number): string[] {
  return validateEntryIssues(section, entry, index).map((issue) => issue.message);
}

const SCALAR_CONTROL_IDS: Record<string, string> = {
  displayName: 'bg-display-name', headline: 'bg-headline', about: 'bg-about',
  location: 'bg-location', targetIndustry: 'bg-target-industry', linkedinUrl: 'bg-linkedin',
};

export function validateProfileIssues(profile: CareerProfile, skills: string[]): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const add = (controlId: string, message: string, detailedOnly = false, section?: SectionKey) => {
    issues.push({ id: `error-${controlId}-${issues.length}`, message, target: { controlId, detailedOnly, section } });
  };
  if (!profile.currentRole.trim()) add('current-role', 'Add your current role or status (for example, Student).');
  if (!profile.industry.trim()) add('industry', 'Choose or enter your industry.');
  if (!skills.length) add('existing-skills', 'Add at least one skill or strength.');
  if (skills.length > MAX_SKILLS) add('existing-skills', `You have ${skills.length} skills; remove ${skills.length - MAX_SKILLS} to stay within ${MAX_SKILLS}.`);
  if (!profile.interests.length) add('interest-search', 'Choose at least one area of interest.');
  const bg = (profile.professionalBackground ?? {}) as Record<string, unknown>;
  for (const [key, max] of Object.entries(BG_SCALAR_MAX)) {
    const v = String(bg[key] ?? '').trim();
    if (v.length > max) add(SCALAR_CONTROL_IDS[key], `${SCALAR_LABELS[key as ScalarKey]} is ${v.length} characters; shorten it to ${max}.`, true);
  }
  const link = String(bg.linkedinUrl ?? '').trim();
  if (link && !isLinkedInProfileUrl(link)) add('bg-linkedin', 'LinkedIn URL must look like https://www.linkedin.com/in/your-name.', true);
  for (const section of SECTIONS) {
    const entries = ((bg[section.key] as ProfessionalEntry[] | undefined) ?? []).filter((e) => !isEntryBlank(e));
    if (entries.length > MAX_ENTRIES) add(`profile-${section.key}-head`, `${section.label} has ${entries.length} entries; remove ${entries.length - MAX_ENTRIES} (limit ${MAX_ENTRIES}).`, true, section.key);
    entries.forEach((entry, i) => issues.push(...validateEntryIssues(section, entry, i)));
  }
  return issues;
}

export function validateProfileDraft(profile: CareerProfile, skills: string[]): string[] {
  return validateProfileIssues(profile, skills).map((issue) => issue.message);
}

/* ---------- paste import ---------- */
export type ImportResult = {
  scalars: Partial<Record<ScalarKey, string>>;
  sections: Partial<Record<SectionKey, ProfessionalEntry[]>>;
  skills: string[];
  unclassified: string[];
  warnings: string[];
  entryWarnings: Record<string, string[]>;
  error?: string;
};

type Target = SectionKey | 'skills' | 'about' | 'ignore';
const HEADINGS: Record<string, Target> = {};
const addHeadings = (target: Target, names: string[]) => names.forEach((n) => { HEADINGS[n] = target; });
addHeadings('experience', ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'internships']);
addHeadings('volunteering', ['volunteer experience', 'volunteering', 'volunteer work', 'volunteer']);
addHeadings('organizations', ['organizations', 'organisations', 'clubs', 'clubs & societies', 'societies', 'memberships']);
addHeadings('education', ['education']);
addHeadings('certifications', ['licenses & certifications', 'licences & certifications', 'certifications', 'certificates', 'licenses', 'certifications & licenses']);
addHeadings('courses', ['courses', 'relevant courses']);
addHeadings('projects', ['projects', 'personal projects', 'academic projects']);
addHeadings('awards', ['honors & awards', 'honours & awards', 'awards', 'honors', 'honours', 'awards & honors']);
addHeadings('publications', ['publications']);
addHeadings('languages', ['languages']);
addHeadings('testScores', ['test scores', 'exam scores']);
addHeadings('skills', ['skills', 'top skills', 'skills & endorsements', 'technical skills']);
addHeadings('about', ['about', 'summary', 'about me', 'profile summary']);
addHeadings('ignore', ['contact', 'contact info', 'interests', 'recommendations', 'activity', 'featured', 'education & credentials', 'additional sections']);

function headingTarget(line: string): Target | null {
  if (!line || line.length > 60) return null;
  const key = line.replace(/^[^\p{L}]+/u, '').replace(/[:\s]+$/, '').toLowerCase().replace(/\s+/g, ' ').replace(/ and /g, ' & ');
  return HEADINGS[key] ?? null;
}

const SCALAR_LABEL_MAP: Record<string, ScalarKey> = {
  name: 'displayName', 'full name': 'displayName', 'display name': 'displayName', headline: 'headline', location: 'location',
  'based in': 'location', industry: 'industry', 'current industry': 'industry', 'target industry': 'targetIndustry',
  'current role': 'currentRole', 'current title': 'currentRole', 'current status': 'currentRole', status: 'currentRole',
  linkedin: 'linkedinUrl', 'linkedin url': 'linkedinUrl', 'linkedin profile': 'linkedinUrl', summary: 'about', about: 'about',
};

const MONTHS: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04', may: '05',
  jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
  oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
};
const PRESENT = 'PRESENT';

export function parseDatePoint(raw: string): string | null {
  const s = raw.trim().replace(/^(expected( graduation)?|graduat(ed|ing)|issued|expires|completed)\s*:?\s*/i, '').replace(/\.$/, '').trim();
  if (/^(present|current|now|ongoing|today)$/i.test(s)) return PRESENT;
  if (isValidDate(s)) return s;
  let m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) { const v = `${m[2]}-${m[1].padStart(2, '0')}`; return isValidDate(v) ? v : null; }
  m = /^([a-z]+)\.?,?\s+(\d{4})$/i.exec(s);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[2]}-${MONTHS[m[1].toLowerCase()]}`;
  return null;
}

export type DateParse = { startDate?: string; endDate?: string; current?: boolean; single?: string };
export function parseDateRange(raw: string): DateParse | null {
  const text = raw.split(/\s+\u00b7\s+/)[0].trim();
  if (!text || text.length > 60) return null;
  const yy = /^(\d{4})\s*[-\u2013\u2014]\s*(\d{4}|present|current)$/i.exec(text);
  const parts = yy ? [yy[1], yy[2]] : text.split(/\s*[\u2013\u2014]\s*|\s+-\s+|\s+to\s+/i);
  if (parts.length === 1) {
    const p = parseDatePoint(parts[0]);
    if (!p) return null;
    return p === PRESENT ? { current: true } : { single: p };
  }
  if (parts.length !== 2) return null;
  const a = parseDatePoint(parts[0]);
  const b = parseDatePoint(parts[1]);
  if (!a || a === PRESENT || !b) return null;
  return b === PRESENT ? { startDate: a, current: true } : { startDate: a, endDate: b };
}

type FieldTarget = EntryTextKey | EntryListKey | 'dates' | 'current' | 'singleDate';
const LABELS: Record<string, FieldTarget> = {};
const addLabels = (target: FieldTarget, names: string[]) => names.forEach((n) => { LABELS[n] = target; });
addLabels('title', ['title', 'position', 'job title', 'name', 'school', 'institution', 'university', 'college', 'language', 'test', 'exam', 'project', 'award', 'certification', 'course']);
addLabels('organization', ['company', 'organization', 'organisation', 'employer', 'issuer', 'issued by', 'issuing organization', 'provider', 'publisher']);
addLabels('startDate', ['start', 'start date', 'from', 'issued', 'issue date']);
addLabels('endDate', ['end', 'end date', 'to', 'until', 'expected graduation', 'graduation', 'expected', 'completed', 'expires', 'expiration']);
addLabels('singleDate', ['date']);
addLabels('dates', ['dates', 'date range', 'period', 'duration']);
addLabels('current', ['current', 'currently']);
addLabels('description', ['description', 'summary', 'details', 'notes', 'activities', 'activities and societies', 'credential id']);
addLabels('achievements', ['achievements', 'highlights', 'accomplishments']);
addLabels('degree', ['degree', 'qualification', 'field of study', 'major']);
addLabels('gpa', ['gpa', 'cgpa', 'grade']);
addLabels('coursework', ['coursework', 'relevant coursework', 'modules']);
addLabels('technologies', ['technologies', 'tech stack', 'stack', 'tools', 'built with']);
addLabels('skills', ['skills']);
addLabels('contribution', ['contribution', 'my role', 'responsibilities']);
addLabels('url', ['url', 'link', 'repository', 'repo', 'github', 'credential url', 'credential', 'website', 'source']);
addLabels('secondaryUrl', ['live url', 'live', 'demo', 'live demo', 'deployment']);
addLabels('proficiency', ['proficiency', 'level']);
addLabels('score', ['score', 'result', 'band']);

const BULLET_RE = /^(?:[-*\u2022\u00b7\u2013\u25aa\u25e6\u2023]|\d+[.)])\s+/;
const LABEL_RE = /^([A-Za-z][A-Za-z /&()-]{0,40}):\s*(.*)$/;
const PROFICIENCY_RE = /proficien|native|fluent|bilingual|basic|intermediate|advanced|conversational|elementary|beginner/i;

function hasField(section: SectionKey, key: string) {
  return SECTION_BY_KEY[section].fields.some((fd) => fd.key === key);
}

function parseRecord(section: SectionKey, lines: string[], warnings: Record<string, string[]>): ProfessionalEntry {
  const entry: Record<string, unknown> = { id: makeEntryId(), title: '' };
  const notes: string[] = [];
  const plain: string[] = [];
  const own: string[] = [];
  const pushList = (key: EntryListKey, values: string[]) => { entry[key] = [...((entry[key] as string[]) ?? []), ...values]; };
  const applyDates = (d: DateParse, singleTo: 'startDate' | 'endDate') => {
    if (d.startDate && !entry.startDate) entry.startDate = d.startDate;
    if (d.endDate && !entry.endDate) entry.endDate = d.endDate;
    if (d.single && !entry[singleTo]) entry[singleTo] = d.single;
    if (d.current) entry.current = true;
  };
  const singleDefault = section === 'certifications' ? 'startDate' : 'endDate';

  for (const line of lines) {
    if (BULLET_RE.test(line)) {
      const content = line.replace(BULLET_RE, '').trim();
      if (hasField(section, 'achievements')) pushList('achievements', [content]); else notes.push(`- ${content}`);
      continue;
    }
    if (/^https?:\/\/\S+$/i.test(line)) {
      if (!entry.url && hasField(section, 'url')) entry.url = line;
      else if (!entry.secondaryUrl && hasField(section, 'secondaryUrl')) entry.secondaryUrl = line;
      else notes.push(line);
      continue;
    }
    const issuedBy = /^issued by\s+(.+)$/i.exec(line);
    if (issuedBy) {
      const [org, ...rest] = issuedBy[1].split(/\s+\u00b7\s+/);
      if (!entry.organization) entry.organization = org.trim(); else notes.push(line);
      for (const r of rest) { const d = parseDateRange(r); if (d) applyDates(d, singleDefault); else notes.push(r); }
      continue;
    }
    const issued = /^issued\s+(.+?)(?:\s+\u00b7\s+expires\s+(.+))?$/i.exec(line);
    if (issued) {
      const a = parseDatePoint(issued[1]);
      const b = issued[2] ? parseDatePoint(issued[2]) : null;
      if (a && a !== PRESENT) entry.startDate = a; else notes.push(line);
      if (b && b !== PRESENT) entry.endDate = b;
      continue;
    }
    const label = LABEL_RE.exec(line);
    if (label) {
      const name = label[1].trim().toLowerCase();
      const value = label[2].trim();
      let target = LABELS[name];
      if (name === 'role' || name === 'position') target = section === 'projects' || section === 'organizations' ? 'contribution' : 'title';
      if (section === 'organizations' && (name === 'organization' || name === 'organisation')) target = 'title';
      if (target && value) {
        if (target === 'dates') { const d = parseDateRange(value); if (d) applyDates(d, singleDefault); else { notes.push(line); own.push(`Could not read dates "${value}".`); } }
        else if (target === 'singleDate' || target === 'startDate' || target === 'endDate') {
          const p = parseDatePoint(value);
          const key = target === 'singleDate' ? singleDefault : target;
          if (p === PRESENT) entry.current = true;
          else if (p) entry[key] = p;
          else { notes.push(line); own.push(`Could not read date "${value}".`); }
        }
        else if (target === 'current') { if (/^(yes|true|y|current)$/i.test(value)) entry.current = true; }
        else if (target === 'coursework' || target === 'technologies' || target === 'skills') pushList(target, splitListText(value, 'tags'));
        else if (target === 'achievements') pushList('achievements', [value]);
        else if (target === 'description') notes.push(name === 'description' ? value : line);
        else if (!hasField(section, target)) notes.push(line);
        else if (entry[target]) notes.push(line);
        else entry[target] = value;
        continue;
      }
      if (!target && section === 'testScores' && !entry.title && value) { entry.title = label[1].trim(); entry.score = value; continue; }
    }
    const dates = parseDateRange(line);
    if (dates && plain.length > 0) { applyDates(dates, singleDefault); continue; }
    plain.push(line);
  }

  if (plain.length && !entry.title) entry.title = plain.shift() as string;
  if (plain.length) {
    const second = plain.shift() as string;
    const [head, ...rest] = second.split(/\s+\u00b7\s+/);
    const slot: EntryTextKey | null = section === 'education' ? 'degree' : section === 'languages' ? 'proficiency'
      : section === 'testScores' ? 'score' : section === 'organizations' ? 'contribution'
      : hasField(section, 'organization') ? 'organization' : null;
    if (slot && !entry[slot]) entry[slot] = head.trim(); else notes.push(head.trim());
    for (const r of rest) { const d = parseDateRange(r); if (d) applyDates(d, singleDefault); else notes.push(r.trim()); }
  }
  notes.push(...plain);
  if (notes.length) {
    const key = hasField(section, 'description') ? 'description' : null;
    if (key) entry.description = [entry.description, ...notes].filter(Boolean).join('\n');
    else own.push(`Extra text kept for review: ${notes.join(' / ')}`);
  }
  if (!entry.title) own.push('No title recognised. Add one before saving.');
  if (['experience', 'volunteering'].includes(section) && !entry.organization) own.push('No organization recognised.');
  if (['experience', 'volunteering', 'education', 'projects'].includes(section) && !entry.startDate && !entry.endDate && !entry.current) own.push('No dates recognised.');
  const result = entry as unknown as ProfessionalEntry;
  if (own.length) warnings[result.id] = own;
  return result;
}

function parseLanguages(lines: string[]): ProfessionalEntry[] {
  const out: ProfessionalEntry[] = [];
  for (const line of lines) {
    const clean = line.replace(BULLET_RE, '').trim();
    const prev = out[out.length - 1];
    if (prev && !prev.proficiency && PROFICIENCY_RE.test(clean) && clean.split(/\s+/).length <= 6) { prev.proficiency = clean; continue; }
    const m = /^(.+?)\s*(?:\((.+)\)|\s[-\u2013\u2014:]\s*(.+))$/.exec(clean);
    if (m) out.push({ id: makeEntryId(), title: m[1].trim(), proficiency: (m[2] ?? m[3]).trim() });
    else out.push({ id: makeEntryId(), title: clean });
  }
  return out;
}

export function parseProfileText(input: string): ImportResult {
  const result: ImportResult = { scalars: {}, sections: {}, skills: [], unclassified: [], warnings: [], entryWarnings: {} };
  if (input.length > MAX_IMPORT_CHARS) {
    result.error = `This text is ${input.length.toLocaleString()} characters. Paste at most ${MAX_IMPORT_CHARS.toLocaleString()} at a time, for example one section at a time.`;
    return result;
  }
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  let current: Target | null = null;
  let block: string[] = [];
  const aboutLines: string[] = [];
  const skillSet = new Set<string>();
  let recognised = 0;

  const flush = () => {
    if (!block.length || !current) { block = []; return; }
    const key = current as SectionKey;
    const list = result.sections[key] ?? (result.sections[key] = []);
    if (key === 'languages') list.push(...parseLanguages(block));
    else list.push(parseRecord(key, block, result.entryWarnings));
    block = [];
  };
  const addSkill = (raw: string) => {
    const s = raw.replace(BULLET_RE, '').trim();
    if (!s) return;
    if (/endorse|^\d+\+?$/i.test(s) || /[?!:]$/.test(s) || s.length > 200) { result.unclassified.push(s); return; }
    if (!skillSet.has(s.toLowerCase())) { skillSet.add(s.toLowerCase()); result.skills.push(s); }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = headingTarget(line);
    if (heading) { flush(); current = heading; recognised += 1; continue; }
    const inRecords = current !== null && (SECTION_KEYS as readonly string[]).includes(current);
    if (inRecords) {
      if (!line) flush(); else block.push(line);
      continue;
    }
    if (current === 'skills') { if (line) line.split(/[,;|\u00b7\u2022]/).forEach(addSkill); continue; }
    if (!line) { if (current === 'about') aboutLines.push(''); continue; }
    const label = LABEL_RE.exec(line);
    if (label && label[2].trim() && current !== 'ignore') {
      const name = label[1].trim().toLowerCase();
      const value = label[2].trim();
      if (name === 'skills' || name === 'top skills') { value.split(/[,;|\u00b7\u2022]/).forEach(addSkill); recognised += 1; continue; }
      const scalar = SCALAR_LABEL_MAP[name];
      if (scalar) {
        recognised += 1;
        if (scalar === 'linkedinUrl' && !isLinkedInProfileUrl(value)) {
          result.warnings.push('A LinkedIn line was found but is not a linkedin.com/in/ profile URL, so it was left unclassified.');
          result.unclassified.push(line);
        } else if (scalar === 'about') aboutLines.push(value);
        else if (result.scalars[scalar]) result.unclassified.push(line);
        else result.scalars[scalar] = value;
        continue;
      }
    }
    if (current === 'about') aboutLines.push(line); else result.unclassified.push(line);
  }
  flush();

  const about = aboutLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (about) result.scalars.about = about;
  result.skills.splice(0, result.skills.length, ...result.skills);
  if (!recognised) result.warnings.push('No supported headings or labels were found. Check the format guide or add headings such as Experience and Education.');
  if (result.unclassified.length) result.warnings.push(`${result.unclassified.length} line(s) could not be classified. They are shown below for manual review and will not be applied.`);
  if (result.skills.length > MAX_SKILLS) result.warnings.push(`${result.skills.length} skills found; the limit is ${MAX_SKILLS}. Trim the list in this preview before applying.`);
  for (const key of SECTION_KEYS) {
    const n = result.sections[key]?.length ?? 0;
    if (n > MAX_ENTRIES) result.warnings.push(`${SECTION_BY_KEY[key].label} has ${n} entries; the limit is ${MAX_ENTRIES}. Remove some before saving.`);
  }
  return result;
}

/* ---------- applying imports ---------- */
export function getScalar(profile: CareerProfile, key: ScalarKey): string {
  if (key === 'currentRole' || key === 'industry') return profile[key] ?? '';
  return ((profile.professionalBackground ?? {}) as Record<string, string | undefined>)[key] ?? '';
}

export type ScalarPlan = { key: ScalarKey; label: string; incoming: string; current: string; status: 'fill' | 'same' | 'conflict' };
export type SectionPlan = { key: SectionKey | 'skills'; label: string; incoming: number; existing: number; status: 'fill' | 'merge' };
export function planImport(profile: CareerProfile, skills: string[], result: ImportResult): { scalars: ScalarPlan[]; sections: SectionPlan[] } {
  const scalars: ScalarPlan[] = [];
  for (const key of SCALAR_KEYS) {
    const incoming = result.scalars[key]?.trim();
    if (!incoming) continue;
    const current = getScalar(profile, key).trim();
    scalars.push({ key, label: SCALAR_LABELS[key], incoming, current, status: !current ? 'fill' : norm(current) === norm(incoming) ? 'same' : 'conflict' });
  }
  const sections: SectionPlan[] = [];
  if (result.skills.length) sections.push({ key: 'skills', label: 'Skills', incoming: result.skills.length, existing: skills.length, status: skills.length ? 'merge' : 'fill' });
  for (const key of SECTION_KEYS) {
    const incoming = result.sections[key]?.length ?? 0;
    if (!incoming) continue;
    const existing = (profile.professionalBackground?.[key] ?? []).filter((e) => !isEntryBlank(e)).length;
    sections.push({ key, label: SECTION_BY_KEY[key].label, incoming, existing, status: existing ? 'merge' : 'fill' });
  }
  return { scalars, sections };
}

// Review fields must stay mounted while being cleared/edited. The apply plan
// deliberately excludes blanks, but using that plan to render removes an input
// as soon as its last character is deleted.
export function importReviewFields(profile: CareerProfile, skills: string[], result: ImportResult): ScalarPlan[] {
  const plan = planImport(profile, skills, result);
  return SCALAR_KEYS.filter((key) => Object.hasOwn(result.scalars, key)).map((key) =>
    plan.scalars.find((field) => field.key === key) ?? {
      key, label: SCALAR_LABELS[key], incoming: "", current: getScalar(profile, key), status: "fill",
    });
}

const entryKey = (e: ProfessionalEntry) => `${norm(e.title)}|${norm(e.organization)}|${norm(e.startDate)}`;

export type ImportChoices = { replaceFields: string[]; mergeSections: string[] };
export type ImportSummary = { filled: string[]; replaced: string[]; keptFields: string[]; addedRecords: number; duplicateRecords: number; skippedSections: string[]; addedSkills: number; duplicateSkills: number };

export function applyImport(profile: CareerProfile, skills: string[], result: ImportResult, choices: ImportChoices): { profile: CareerProfile; skills: string[]; summary: ImportSummary } {
  const summary: ImportSummary = { filled: [], replaced: [], keptFields: [], addedRecords: 0, duplicateRecords: 0, skippedSections: [], addedSkills: 0, duplicateSkills: 0 };
  const next: CareerProfile = { ...profile };
  const bg: Record<string, unknown> = { ...(profile.professionalBackground ?? {}) };
  const plan = planImport(profile, skills, result);

  for (const item of plan.scalars) {
    if (item.status === 'same') continue;
    if (item.status === 'conflict' && !choices.replaceFields.includes(item.key)) { summary.keptFields.push(item.label); continue; }
    if (item.key === 'currentRole' || item.key === 'industry') next[item.key] = item.incoming; else bg[item.key] = item.incoming;
    (item.status === 'fill' ? summary.filled : summary.replaced).push(item.label);
  }

  let nextSkills = [...skills];
  const skillPlan = plan.sections.find((s) => s.key === 'skills');
  if (skillPlan) {
    if (skillPlan.status === 'merge' && !choices.mergeSections.includes('skills')) summary.skippedSections.push('Skills');
    else {
      const seen = new Set(nextSkills.map((s) => s.toLowerCase()));
      for (const skill of result.skills) {
        const s = skill.trim();
        if (!s) continue;
        if (seen.has(s.toLowerCase())) { summary.duplicateSkills += 1; continue; }
        seen.add(s.toLowerCase());
        nextSkills.push(s);
        summary.addedSkills += 1;
      }
    }
  }

  for (const item of plan.sections) {
    if (item.key === 'skills') continue;
    const key = item.key;
    if (item.status === 'merge' && !choices.mergeSections.includes(key)) { summary.skippedSections.push(item.label); continue; }
    const existing = [...((bg[key] as ProfessionalEntry[] | undefined) ?? [])];
    const keys = new Set(existing.filter((e) => !isEntryBlank(e)).map(entryKey));
    const ids = new Set(existing.map((e) => e.id));
    for (const incoming of result.sections[key] ?? []) {
      if (isEntryBlank(incoming)) continue;
      const k = entryKey(incoming);
      if (keys.has(k)) { summary.duplicateRecords += 1; continue; }
      keys.add(k);
      const id = ids.has(incoming.id) ? makeEntryId() : incoming.id;
      ids.add(id);
      existing.push({ ...incoming, id });
      summary.addedRecords += 1;
    }
    bg[key] = existing;
  }
  next.professionalBackground = bg as ProfessionalBackground;
  return { profile: next, skills: nextSkills, summary };
}
