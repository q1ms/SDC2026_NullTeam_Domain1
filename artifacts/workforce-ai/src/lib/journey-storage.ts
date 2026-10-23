import { z } from 'zod';
import type { CareerRole } from './career-model.ts';

// One atomic snapshot keeps role IDs tied to the dataset that created them.
export const JOURNEY_STORAGE_KEY = 'career-futures.journey';
export const MAX_SNAPSHOT_BYTES = 2_000_000;
const text = z.string().trim().min(1).max(500);
const skillList = z.array(text).max(1000);
const roleSchema = z.object({
  id: text, title: text, sector: text,
  growth: z.number().finite(),
  moderateGrowth: z.number().finite(), fastGrowth: z.number().finite(),
  moderateResilience: z.number().finite(), fastResilience: z.number().finite(),
  skills: skillList.min(1), sdgs: z.array(text).max(100),
}).strict();
const snapshotSchema = z.object({
  version: z.literal(1),
  skills: skillList.refine((skills) => new Set(skills.map((s) => s.toLowerCase())).size === skills.length),
  scenario: z.enum(['moderate', 'fast']),
  selectedId: text.nullable(),
  step: z.enum(['skills', 'results']),
  dataset: z.discriminatedUnion('source', [
    z.object({ source: z.literal('built-in') }).strict(),
    z.object({
      source: z.literal('imported'),
      roles: z.array(roleSchema).min(1).max(10000).refine((roles) => new Set(roles.map((r) => r.id)).size === roles.length),
    }).strict(),
  ]),
}).strict();

export type JourneySnapshot = z.infer<typeof snapshotSchema>;
export type DeviceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const emptyJourney = (): JourneySnapshot => ({
  version: 1, skills: [], scenario: 'moderate', selectedId: null, step: 'skills',
  dataset: { source: 'built-in' },
});

export function parseJourney(raw: string): JourneySnapshot {
  if (new TextEncoder().encode(raw).length > MAX_SNAPSHOT_BYTES) throw new Error('Saved profile is too large.');
  const snapshot = snapshotSchema.parse(JSON.parse(raw));
  if (!snapshot.skills.length) snapshot.step = 'skills';
  if (snapshot.dataset.source === 'imported' && !snapshot.dataset.roles.some((role) => role.id === snapshot.selectedId)) {
    snapshot.selectedId = null;
  }
  return snapshot;
}

// A clear keeps only a random revision, never profile data. This prevents an
// absent -> saved -> cleared cycle from looking unchanged to an older tab.
const recordSchema = z.object({
  revision: z.string().min(1),
  snapshot: snapshotSchema.nullable(),
}).strict();

export function restoreJourney(getStorage: () => DeviceStorage): { snapshot: JourneySnapshot; notice: string; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = getStorage().getItem(JOURNEY_STORAGE_KEY);
    if (raw === null) return { snapshot: emptyJourney(), notice: '', raw };
    try {
      if (new TextEncoder().encode(raw).length > MAX_SNAPSHOT_BYTES) throw new Error('Too large');
      const decoded = JSON.parse(raw);
      // Continue to read profiles saved before cross-tab coordination.
      const record = recordSchema.safeParse(decoded);
      const snapshot = record.success
        ? record.data.snapshot === null ? emptyJourney() : parseJourney(JSON.stringify(record.data.snapshot))
        : parseJourney(raw);
      return { snapshot, notice: '', raw };
    } catch {
      return { snapshot: emptyJourney(), notice: 'The saved profile was invalid or from an unsupported version. A fresh session was started.', raw };
    }
  } catch {
    return { snapshot: emptyJourney(), notice: 'Device storage is unavailable. Changes may be lost when you refresh.', raw };
  }
}

export function saveJourney(storage: DeviceStorage, snapshot: JourneySnapshot, forceRevision = false): 'saved' | 'empty' {
  snapshot = parseJourney(JSON.stringify(snapshot));
  const empty = !snapshot.skills.length && snapshot.scenario === 'moderate' && snapshot.step === 'skills' && snapshot.dataset.source === 'built-in';
  const previous = storage.getItem(JOURNEY_STORAGE_KEY);
  if (!forceRevision) {
    if (previous === null && empty) return 'empty';
    try {
      const record = recordSchema.safeParse(JSON.parse(previous ?? 'null'));
      if (record.success && JSON.stringify(record.data.snapshot) === JSON.stringify(empty ? null : snapshot)) {
        return empty ? 'empty' : 'saved';
      }
    } catch { /* Invalid saved data can be replaced by a valid profile. */ }
  }
  const raw = JSON.stringify({ revision: crypto.randomUUID(), snapshot: empty ? null : snapshot });
  if (new TextEncoder().encode(raw).length > MAX_SNAPSHOT_BYTES) throw new Error('Saved profile is too large.');
  storage.setItem(JOURNEY_STORAGE_KEY, raw);
  return empty ? 'empty' : 'saved';
}

// Call inside the shared Web Lock. Compare again at write time, not only when a
// storage event arrives: events can be delayed while a tab is suspended.
export function commitJourney(storage: DeviceStorage, expectedRaw: string | null, snapshot: JourneySnapshot, forceRevision = false) {
  const current = storage.getItem(JOURNEY_STORAGE_KEY);
  if (current !== expectedRaw) return { status: 'conflict' as const, raw: current };
  const status = saveJourney(storage, snapshot, forceRevision);
  return { status, raw: storage.getItem(JOURNEY_STORAGE_KEY) };
}

export function datasetSnapshot(builtIn: boolean, roles: CareerRole[]): JourneySnapshot['dataset'] {
  return builtIn ? { source: 'built-in' } : { source: 'imported', roles };
}
