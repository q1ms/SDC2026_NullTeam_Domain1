import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_IMPORT_CHARS, applyImport, cleanBackground, isDateOrderValid, isLinkedInProfileUrl, isValidDate,
  importReviewFields, parseDateRange, parseProfileText, parseSkills, planImport, safeExternalUrl, validateProfileDraft,
} from "../src/data/professional-profile.ts";

const base = { currentRole: "Student", yearsExperience: 0, industry: "Education", skills: ["Python"], interests: ["EdTech"], weeklyHours: 4, profileMode: "detailed", professionalBackground: {} };

const SAMPLE = `Mystery line
Headline: CS student
Location: Kuala Lumpur

Experience
Teaching Assistant
Universiti Malaya · Part-time
Feb 2024 - Present · 1 yr
- Ran weekly tutorials
Skills: Python, Public speaking

Freelance Designer
2021 - 2022

Education
School: Universiti Malaya
Degree: BSc Computer Science
Dates: 2022 - 2026
GPA: 3.8
Coursework: Databases, Statistics

Licenses & certifications
AWS Certified Cloud Practitioner
Amazon Web Services
Issued Jan 2024 · Expires Jan 2027

Projects
Title: jAIX
Technologies: React, Node.js
Role: Frontend lead
https://github.com/me/jaix

Honors & awards
Top 15 Finalist
Issued by SDC · Mar 2026

Languages
English - Native
Bahasa Malaysia
Professional working proficiency

Test scores
IELTS: 7.5

Skills
React, SQL, python
12 endorsements`;

test("parses LinkedIn-style and labelled records across sections", () => {
  const r = parseProfileText(SAMPLE);
  assert.equal(r.scalars.headline, "CS student");
  assert.equal(r.scalars.location, "Kuala Lumpur");
  const [ta, freelance] = r.sections.experience;
  assert.equal(ta.title, "Teaching Assistant");
  assert.equal(ta.organization, "Universiti Malaya");
  assert.equal(ta.startDate, "2024-02");
  assert.equal(ta.current, true);
  assert.deepEqual(ta.achievements, ["Ran weekly tutorials"]);
  assert.deepEqual(ta.skills, ["Python", "Public speaking"]);
  assert.equal(freelance.startDate, "2021");
  assert.ok(r.entryWarnings[freelance.id].some((w) => /organization/i.test(w)), "missing org flagged, not invented");
  const edu = r.sections.education[0];
  assert.deepEqual([edu.title, edu.degree, edu.startDate, edu.endDate, edu.gpa], ["Universiti Malaya", "BSc Computer Science", "2022", "2026", "3.8"]);
  assert.deepEqual(edu.coursework, ["Databases", "Statistics"]);
  const cert = r.sections.certifications[0];
  assert.deepEqual([cert.organization, cert.startDate, cert.endDate], ["Amazon Web Services", "2024-01", "2027-01"]);
  const proj = r.sections.projects[0];
  assert.deepEqual([proj.title, proj.contribution, proj.url], ["jAIX", "Frontend lead", "https://github.com/me/jaix"]);
  assert.deepEqual(proj.technologies, ["React", "Node.js"]);
  assert.deepEqual([r.sections.awards[0].organization, r.sections.awards[0].endDate], ["SDC", "2026-03"]);
  assert.deepEqual(r.sections.languages.map((l) => [l.title, l.proficiency]), [["English", "Native"], ["Bahasa Malaysia", "Professional working proficiency"]]);
  assert.deepEqual([r.sections.testScores[0].title, r.sections.testScores[0].score], ["IELTS", "7.5"]);
  assert.deepEqual(r.skills, ["React", "SQL", "python"]);
  assert.ok(r.unclassified.includes("12 endorsements"));
  assert.ok(r.unclassified.includes("Mystery line"));
});

test("unclassified text and oversize input are surfaced, not dropped", () => {
  const r = parseProfileText("Random note\nAnother");
  assert.deepEqual(r.unclassified, ["Random note", "Another"]);
  assert.ok(r.warnings.length >= 1);
  const big = parseProfileText("x".repeat(MAX_IMPORT_CHARS + 1));
  assert.ok(big.error);
  assert.deepEqual(big.sections, {});
});

test("review keeps cleared scalar inputs available and leaves unfamiliar headings unclassified", () => {
  const profile = { ...base, professionalBackground: { headline: "Existing headline" } };
  const imported = parseProfileText("Headline: Imported headline\nLocation: Kuala Lumpur\n\nSkills\nSQL, Python\n\nUnclassified section heading?");
  assert.equal(importReviewFields(profile, base.skills, imported).find((field) => field.key === "headline").status, "conflict");
  imported.scalars.headline = "";
  assert.ok(importReviewFields(profile, base.skills, imported).some((field) => field.key === "headline"));
  assert.ok(!planImport(profile, base.skills, imported).scalars.some((field) => field.key === "headline"));
  imported.scalars.headline = "Reviewed headline";
  const applied = applyImport(profile, base.skills, imported, { replaceFields: ["headline"], mergeSections: ["skills"] });
  assert.equal(applied.profile.professionalBackground.headline, "Reviewed headline");
  assert.deepEqual(imported.skills, ["SQL", "Python"]);
  assert.deepEqual(imported.unclassified, ["Unclassified section heading?"]);
});

test("invalid LinkedIn line is left unclassified", () => {
  const r = parseProfileText("LinkedIn: https://evil.example/in/me");
  assert.equal(r.scalars.linkedinUrl, undefined);
  assert.equal(r.unclassified.length, 1);
});

test("plan and apply: fills blanks, respects replace/merge choices, dedupes", () => {
  const profile = { ...base, professionalBackground: { headline: "Existing", experience: [{ id: "a", title: "Teaching Assistant", organization: "Universiti Malaya", startDate: "2024-02" }] } };
  const r = parseProfileText(SAMPLE);
  const plan = planImport(profile, ["Python"], r);
  assert.equal(plan.scalars.find((s) => s.key === "headline").status, "conflict");
  assert.equal(plan.scalars.find((s) => s.key === "location").status, "fill");
  assert.equal(plan.sections.find((s) => s.key === "experience").status, "merge");

  const kept = applyImport(profile, ["Python"], r, { replaceFields: [], mergeSections: [] });
  assert.equal(kept.profile.professionalBackground.headline, "Existing");
  assert.equal(kept.profile.professionalBackground.location, "Kuala Lumpur");
  assert.equal(kept.profile.professionalBackground.experience.length, 1);
  assert.deepEqual(kept.skills, ["Python"]);
  assert.equal(kept.profile.professionalBackground.education.length, 1, "empty sections fill by default");
  assert.ok(kept.summary.skippedSections.includes("Experience"));

  const merged = applyImport(profile, ["Python"], r, { replaceFields: ["headline"], mergeSections: ["experience", "skills"] });
  assert.equal(merged.profile.professionalBackground.headline, "CS student");
  assert.equal(merged.profile.professionalBackground.experience.length, 2);
  assert.equal(merged.summary.duplicateRecords, 1);
  assert.deepEqual(merged.skills, ["Python", "React", "SQL"]);
  assert.equal(profile.professionalBackground.experience.length, 1, "input not mutated (cancel is safe)");
  const ids = merged.profile.professionalBackground.experience.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("validation: dates, order, current, links, limits, student without jobs", () => {
  assert.ok(isValidDate("2024") && isValidDate("2024-02-29") && !isValidDate("2023-02-29") && !isValidDate("2024-13"));
  assert.ok(isDateOrderValid("2024-05", "2024") && !isDateOrderValid("2025", "2024-12"));
  assert.deepEqual(parseDateRange("Sep 2022 – Jun 2026"), { startDate: "2022-09", endDate: "2026-06" });
  assert.ok(isLinkedInProfileUrl("https://my.linkedin.com/in/someone/") && isLinkedInProfileUrl("https://linkedin.com/in/a"));
  assert.ok(!isLinkedInProfileUrl("https://linkedin.com/company/x") && !isLinkedInProfileUrl("javascript:alert(1)") && !isLinkedInProfileUrl("https://linkedin.com.evil.io/in/a"));
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("https://u:p@x.com"), null);
  assert.deepEqual(validateProfileDraft(base, ["Python"]), []);
  const bad = { ...base, professionalBackground: { linkedinUrl: "https://x.com/in/a", projects: [{ id: "p", title: "", url: "ftp://x", startDate: "2025", endDate: "2024" }], experience: [{ id: "e", title: "Job", startDate: "2024", endDate: "2020", current: true }] } };
  const issues = validateProfileDraft(bad, ["Python"]);
  assert.ok(issues.some((i) => /LinkedIn/.test(i)));
  assert.ok(issues.some((i) => /http/.test(i)));
  assert.ok(issues.some((i) => /before the start/.test(i)));
  assert.ok(issues.some((i) => /add a project title/i.test(i)));
  assert.ok(!issues.some((i) => /Experience/.test(i)), "end date ignored while current");
  const many = Array.from({ length: 57 }, (_, i) => `s${i}`);
  assert.ok(validateProfileDraft(base, many).some((i) => /remove 7/.test(i)));
  assert.equal(parseSkills("a, B, b\nc").length, 3);
});

test("cleanBackground drops blank rows, keeps data, preserves removals", () => {
  const out = cleanBackground({ headline: "  ", experience: [{ id: "x", title: "" }, { id: "y", title: " Role ", achievements: ["", " a "] }] });
  assert.equal(out.headline, undefined);
  assert.deepEqual(out.experience, [{ id: "y", title: "Role", achievements: ["a"] }]);
  assert.deepEqual(out.projects, [], "empty arrays sent so removals persist");
});
