import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commitJourney, emptyJourney, JOURNEY_STORAGE_KEY, MAX_SNAPSHOT_BYTES, parseJourney, restoreJourney, saveJourney, type DeviceStorage, type JourneySnapshot } from './journey-storage.ts';
import { getRecommendedRoles, getSelectedRecommendation } from './career-journey.ts';
import { rolesFromCsv } from './career-model.ts';

const csv = [
  'role,sector,moderate_growth_pct,fast_growth_pct,moderate_resilience,fast_resilience,skills,sdgs',
  'Solar Planner,Energy,7,19,80,90,Excel|solar design,SDG 7|SDG 13',
  'Community Educator,Education,3,11,75,85,Communication|facilitation,SDG 4',
].join('\n');
function memoryStorage() {
  const values = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  return storage;
}
function profile(): JourneySnapshot {
  return { ...emptyJourney(), skills: ['Excel', 'Communication'], scenario: 'fast', step: 'results', selectedId: 'role-1', dataset: { source: 'imported', roles: rolesFromCsv(csv) } };
}

test('round trip preserves skills, scenario, current step, selected role and positive imported projections', () => {
  const storage = memoryStorage();
  const original = profile();
  assert.equal(saveJourney(storage, original), 'saved');
  const restored = restoreJourney(() => storage);
  assert.equal(restored.notice, '');
  assert.deepEqual(restored.snapshot, original);
  const roles = restored.snapshot.dataset.source === 'imported' ? restored.snapshot.dataset.roles : [];
  const recs = getRecommendedRoles(roles, original.skills, original.scenario);
  assert.equal(getSelectedRecommendation(recs, restored.snapshot.selectedId)?.title, 'Community Educator');
  assert.deepEqual(recs.map((r) => r.growth), [19, 11]);
});

test('malformed JSON, unsupported versions and invalid nested shapes restore defaults with a notice', () => {
  const invalid = [
    '{', 'null', '[]', JSON.stringify({ ...profile(), version: 2 }),
    JSON.stringify({ ...profile(), scenario: 'extreme' }),
    JSON.stringify({ ...profile(), skills: ['Excel', 'excel'] }),
    JSON.stringify({ ...profile(), selectedId: 3 }),
    JSON.stringify({ ...profile(), step: 'unknown' }),
    JSON.stringify({ ...profile(), dataset: { source: 'imported', roles: [] } }),
    JSON.stringify({ ...profile(), dataset: { source: 'imported', roles: [{ ...rolesFromCsv(csv)[0], fastGrowth: '19' }] } }),
    JSON.stringify({ ...profile(), dataset: { source: 'imported', roles: [rolesFromCsv(csv)[0], rolesFromCsv(csv)[0]] } }),
    ' '.repeat(MAX_SNAPSHOT_BYTES + 1),
  ];
  for (const raw of invalid) {
    const storage = memoryStorage();
    storage.setItem(JOURNEY_STORAGE_KEY, raw);
    const result = restoreJourney(() => storage);
    assert.deepEqual(result.snapshot, emptyJourney());
    assert.match(result.notice, /invalid|unsupported/);
  }
});

test('missing profiles are normal and blocked access is reported without throwing', () => {
  assert.deepEqual(restoreJourney(memoryStorage), { snapshot: emptyJourney(), notice: '', raw: null });
  assert.match(restoreJourney(() => { throw new Error('blocked'); }).notice, /unavailable/);
});

test('stale selections are reconciled against the active dataset and shortlist', () => {
  const original = profile();
  original.selectedId = 'removed-role';
  const restored = parseJourney(JSON.stringify(original));
  assert.equal(restored.selectedId, null);
  const roles = rolesFromCsv(csv);
  const recs = getRecommendedRoles(roles, original.skills, original.scenario);
  assert.equal(getSelectedRecommendation(recs, restored.selectedId)?.id, recs[0].id);
  assert.equal(getSelectedRecommendation([], 'role-1'), null);
});

test('CSV replacement is atomic and retains the replacement projections, not old row IDs', () => {
  const storage = memoryStorage();
  saveJourney(storage, profile());
  const replacement = rolesFromCsv(csv.replace('Solar Planner', 'Grid Planner').replace(',19,', ',29,'));
  const next = { ...profile(), selectedId: null, dataset: { source: 'imported' as const, roles: replacement } };
  saveJourney(storage, next);
  assert.deepEqual(restoreJourney(() => storage).snapshot, next);
  assert.equal(replacement[0].fastGrowth, 29);
});

test('empty profiles clear only the app key and write failures do not erase an earlier snapshot', () => {
  const storage = memoryStorage();
  storage.setItem('unrelated', 'keep');
  saveJourney(storage, profile());
  const previous = storage.getItem(JOURNEY_STORAGE_KEY);
  assert.throws(() => saveJourney({ ...storage, setItem: () => { throw new Error('quota'); } }, { ...profile(), skills: ['Different'] }));
  assert.equal(storage.getItem(JOURNEY_STORAGE_KEY), previous);
  assert.throws(() => saveJourney(storage, { ...profile(), skills: [''] }));
  assert.equal(storage.getItem(JOURNEY_STORAGE_KEY), previous);
  assert.equal(saveJourney(storage, emptyJourney()), 'empty');
  assert.equal(JSON.parse(storage.getItem(JOURNEY_STORAGE_KEY)!).snapshot, null);
  assert.deepEqual(restoreJourney(() => storage).snapshot, emptyJourney());
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('results without skills return to skills entry', () => {
  assert.equal(parseJourney(JSON.stringify({ ...emptyJourney(), step: 'results' })).step, 'skills');
});

test('a stale tab cannot replace a newer atomic dataset or undo a clear, even before an event arrives', () => {
  const storage = memoryStorage();
  const first = commitJourney(storage, null, profile());
  const oldTab = first.raw;
  const replacement = { ...profile(), selectedId: null, dataset: { source: 'imported' as const, roles: rolesFromCsv(csv.replace('Solar Planner', 'Grid Planner')) } };
  const newer = commitJourney(storage, oldTab, replacement);
  assert.equal(newer.status, 'saved');
  assert.equal(commitJourney(storage, oldTab, profile()).status, 'conflict');
  assert.deepEqual(restoreJourney(() => storage).snapshot, replacement);
  const cleared = commitJourney(storage, newer.raw, emptyJourney(), true);
  assert.equal(cleared.status, 'empty');
  assert.equal(commitJourney(storage, newer.raw, replacement).status, 'conflict');
  assert.deepEqual(restoreJourney(() => storage).snapshot, emptyJourney());
  assert.equal(JSON.parse(cleared.raw!).snapshot, null);
  assert.ok(!cleared.raw!.includes('Excel'));
});

test('clear revisions prevent absent/saved/cleared cycles and unchanged reads do not create conflicts', () => {
  const storage = memoryStorage();
  const first = commitJourney(storage, null, profile());
  assert.equal(commitJourney(storage, first.raw, profile()).raw, first.raw);
  const cleared = commitJourney(storage, first.raw, emptyJourney(), true);
  assert.notEqual(cleared.raw, null);
  assert.equal(commitJourney(storage, null, profile()).status, 'conflict');
  assert.equal(commitJourney(storage, cleared.raw, emptyJourney()).raw, cleared.raw);
  const again = commitJourney(storage, cleared.raw, emptyJourney(), true);
  assert.notEqual(again.raw, cleared.raw);
});

test('legacy profiles still restore and migrate on the next guarded write', () => {
  const storage = memoryStorage();
  const legacy = JSON.stringify(profile());
  storage.setItem(JOURNEY_STORAGE_KEY, legacy);
  assert.deepEqual(restoreJourney(() => storage).snapshot, profile());
  const result = commitJourney(storage, legacy, profile());
  assert.equal(result.status, 'saved');
  assert.deepEqual(JSON.parse(result.raw!).snapshot, profile());
});
