import assert from "node:assert/strict";
import { test } from "node:test";
import { getReadingTerms, selectPersonalizedCoverage } from "../src/lib/personalized-reading.ts";

const profile = {
  industry: "Healthcare", currentRole: "Nurse", interests: ["Climate & sustainability"],
  skills: [], yearsExperience: 3, weeklyHours: 4,
};
const article = (headline, overrides = {}) => ({
  topic: "Recent coverage", headline, summary: "", sourceName: "Example News",
  articleUrl: `https://example.test/${encodeURIComponent(headline)}`,
  publishedAt: "2026-10-23T09:00:00Z", mentions: 1, ...overrides,
});

test("matches industry, role and selected interests, excluding unrelated stories", () => {
  const articles = [article("Healthcare AI tools"), article("Nurse training"),
    article("Climate investment"), article("New gaming devices")];
  assert.deepEqual(selectPersonalizedCoverage(articles, profile), articles.slice(0, 3));
});

test("uses article summaries and topics as well as headlines, preserving source metadata", () => {
  const articles = [article("New tools", { summary: "Research on healthcare." }),
    article("New research", { topic: "Sustainability" })];
  assert.deepEqual(selectPersonalizedCoverage(articles, profile), articles);
});

test("profile edits immediately change results without hardcoded topics", () => {
  const articles = [article("Healthcare AI tools"), article("Retail stock planning"),
    article("Architect career skills"), article("Cybersecurity training")];
  const edited = { ...profile, industry: "Retail", currentRole: "Architect", interests: ["Cybersecurity"] };
  assert.deepEqual(selectPersonalizedCoverage(articles, edited), articles.slice(1));
});

test("normalizes accents and punctuation, but does not match AI inside unrelated words", () => {
  const edited = { ...profile, industry: "Éducation", currentRole: "", interests: ["AI & automation"] };
  const articles = [article("Education opportunities"), article("AI: new research"),
    article("Chair design"), article("The and with for")];
  assert.deepEqual(selectPersonalizedCoverage(articles, edited), articles.slice(0, 2));
});

test("no matches and empty profile terms produce no unrelated fallback", () => {
  assert.deepEqual(selectPersonalizedCoverage([article("Gaming consoles")], profile), []);
  assert.deepEqual(selectPersonalizedCoverage([article("Gaming consoles")], {
    ...profile, industry: "", currentRole: "", interests: [],
  }), []);
});

test("ranks stronger matches first, deduplicates links and limits the list to five", () => {
  const weak = article("Healthcare news");
  const strong = article("Healthcare Nurse Climate sustainability");
  const others = Array.from({ length: 6 }, (_, index) => article(`Healthcare update ${index}`));
  const matches = selectPersonalizedCoverage([weak, ...others, strong, { ...strong }], profile);
  assert.equal(matches.length, 5);
  assert.equal(matches[0], strong);
  assert.equal(new Set(matches.map((item) => item.articleUrl)).size, 5);
});

test("profile terms are trimmed, case-insensitively deduplicated, and include all curiosity choices", () => {
  assert.deepEqual(getReadingTerms({ ...profile, currentRole: " Healthcare ", interests: ["AI", "ai", "Climate"] }),
    ["Healthcare", "AI", "Climate"]);
});
