import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";

const dir = await mkdtemp(resolve(tmpdir(), "professional-profile-"));
const root = fileURLToPath(new URL("..", import.meta.url));
const path = resolve(dir, "profiles.sqlite");
process.env.CAREER_DB_PATH = path;
const id = "00000000-0000-4000-8000-000000000015";
const old = new DatabaseSync(path);
old.exec(`CREATE TABLE career_profiles (
  id TEXT PRIMARY KEY, current_role TEXT NOT NULL, years_experience INTEGER NOT NULL,
  industry TEXT NOT NULL, weekly_hours INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);`);
old.prepare("INSERT INTO career_profiles VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, "Student", 0, "Education", 4, "2026-01-01", "2026-01-01");
old.close();
const modulePath = resolve(dir, "model.mjs");
await build({
  stdin: { contents: `
    export * from "./src/lib/career-db";
    export * from "./src/lib/professional-profile";
    export * from "./src/lib/career-matching";
    export * from "./src/lib/career-signals";
    export * from "./src/lib/career-seed";
    export { SaveCareerProfileBody, GetCareerProfileResponse } from "@workspace/api-zod";
  `, resolveDir: root },
  outfile: modulePath, bundle: true, platform: "node", format: "esm",
});
const model = await import(pathToFileURL(modulePath));
after(async () => { await rm(dir, { recursive: true, force: true }); });
const quick = { currentRole: "Student", yearsExperience: 0, industry: "Education", skills: ["Communication"], interests: ["Data & analytics"], weeklyHours: 4 };
const sections = model.PROFESSIONAL_SECTIONS;
const entry = { id: "entry-1", title: "Learning record", startDate: "2024-02", endDate: "2025-03", description: "Self-reported", url: "https://example.org/course" };

test("additive migration retains an existing quick profile", () => {
  const profile = model.getCareerProfile(id);
  assert.equal(profile.currentRole, "Student");
  assert.equal(profile.profileMode, "quick");
  assert.equal(profile.professionalBackground, undefined);
});

test("all professional sections create, edit, delete and round-trip across processes", () => {
  const background = { displayName: "Test learner", headline: "Learning professional", location: "Kuala Lumpur", targetIndustry: "Education",
    linkedinUrl: "https://www.linkedin.com/in/test-learner/",
    ...Object.fromEntries(sections.map((section) => [section, [{ ...entry, id: section, title: `${section} record` }]])),
  };
  const detailed = model.SaveCareerProfileBody.parse({ ...quick, profileMode: "detailed", professionalBackground: background });
  const saved = model.saveCareerProfile(id, detailed);
  assert.deepEqual(saved.professionalBackground, background);
  assert.deepEqual(model.GetCareerProfileResponse.parse(saved).professionalBackground, background);
  const reopened = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e",
    `const m=await import(${JSON.stringify(pathToFileURL(modulePath).href)}); process.stdout.write(JSON.stringify(m.getCareerProfile(${JSON.stringify(id)})));`,
  ], { env: { ...process.env, CAREER_DB_PATH: path }, encoding: "utf8" }));
  assert.deepEqual(reopened.professionalBackground, background);
  const edited = { ...background, education: [{ ...entry, title: "Edited degree" }], awards: [] };
  const editedSaved = model.saveCareerProfile(id, { ...detailed, professionalBackground: edited });
  assert.equal(editedSaved.professionalBackground.education[0].title, "Edited degree");
  assert.deepEqual(editedSaved.professionalBackground.awards, []);
  // A legacy/quick save must not erase details it does not know about.
  const legacySave = model.saveCareerProfile(id, { ...quick, currentRole: "Graduate" });
  assert.equal(legacySave.profileMode, "detailed");
  assert.deepEqual(legacySave.professionalBackground, edited);
  const switched = model.saveCareerProfile(id, { ...quick, profileMode: "quick" });
  assert.deepEqual(switched.professionalBackground, edited);
  assert.deepEqual(model.saveCareerProfile(id, { ...quick, professionalBackground: {} }).professionalBackground, {});
});

test("optional sections remain optional; limits reject rather than truncate", () => {
  assert.equal(model.SaveCareerProfileBody.safeParse(quick).success, true);
  assert.equal(model.SaveCareerProfileBody.safeParse({ ...quick, skills: Array(51).fill("Skill") }).success, false);
  assert.equal(model.SaveCareerProfileBody.safeParse({ ...quick, professionalBackground: { projects: Array(31).fill(entry) } }).success, false);
  assert.equal(model.SaveCareerProfileBody.safeParse({ ...quick, professionalBackground: { about: "x".repeat(5001) } }).success, false);
});

test("server rejects unsafe links, invalid dates, reversed intervals and duplicate record IDs", () => {
  for (const bad of [
    { linkedinUrl: "https://linkedin.com.evil.example/in/test" },
    { linkedinUrl: "javascript:alert(1)" },
    { projects: [{ ...entry, url: "data:text/html,no" }] },
    { projects: [{ ...entry, url: "https://user:pass@example.org" }] },
    { education: [{ ...entry, startDate: "2025-02-29" }] },
    { experience: [{ ...entry, startDate: "2026-03", endDate: "2025-03" }] },
    { courses: [entry, entry] },
  ]) {
    assert.ok(model.validateProfessionalProfile({ ...quick, professionalBackground: bad }).length > 0);
  }
  assert.deepEqual(model.validateProfessionalProfile({ ...quick, professionalBackground: {
    education: [{ ...entry, startDate: "2024-02-29", endDate: "2025" }],
    experience: [{ ...entry, current: true, endDate: "not-applicable" }],
  } }), []);
});

test("explicit coursework and technologies affect matching with source attribution, not narrative or grades", () => {
  const generate = (profile) => model.buildPathway(id, profile, model.JOB_ROLES, model.curatedEvidence(), "2026-01-01");
  const baseline = generate(quick);
  const enriched = generate({ ...quick, professionalBackground: {
    education: [{ id: "edu", title: "Degree", coursework: ["SQL"] }],
    projects: [{ id: "project", title: "Dashboard", technologies: ["Power BI"] }],
    courses: [{ id: "course", title: "Business storytelling" }],
  } });
  const bi = (result) => result.analysis.comparisons[0].scenarios.find((scenario) => scenario.roleTitle === "Business Intelligence Analyst");
  assert.ok(bi(enriched).matchScore > bi(baseline).matchScore);
  assert.match(bi(enriched).scoreBasis, /coursework/);
  assert.match(bi(enriched).scoreBasis, /projects: technology/);
  const narrative = generate({ ...quick, professionalBackground: {
    displayName: "Prestigious name", location: "London", targetIndustry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/test/",
    education: [{ id: "edu", title: "Prestigious university", gpa: "4.0", description: "SQL Power BI expert" }],
    testScores: [{ id: "test", title: "IELTS", score: "9" }],
    experience: [{ id: "work", title: "Executive", description: "SQL Power BI leadership" }],
  } });
  assert.deepEqual(narrative.scenarios.map((scenario) => scenario.matchScore), baseline.scenarios.map((scenario) => scenario.matchScore));
  assert.match(narrative.analysis.profileSummary, /local demand not verified/);
});
