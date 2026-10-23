import assert from "node:assert/strict";
import { test } from "node:test";
import { getInterestSuggestions, INTEREST_OPTIONS } from "../src/data/catalog.ts";

test("includes all requested career interest options without duplicates", () => {
  const requested = [
    "Healthcare & MedTech",
    "Creative & Design",
    "FinTech & Blockchain",
    "Smart Cities & IoT",
    "Supply Chain & Logistics",
    "AI Ethics & Policy",
  ];

  for (const interest of requested) {
    assert.ok(INTEREST_OPTIONS.includes(interest), `Missing option: ${interest}`);
  }
  assert.equal(new Set(INTEREST_OPTIONS).size, INTEREST_OPTIONS.length);
});

test("matches related areas for AI, technology, and health searches", () => {
  const technologyMatches = getInterestSuggestions("tech");
  assert.ok(technologyMatches.includes("AI & automation"));
  assert.ok(technologyMatches.includes("Cybersecurity"));
  assert.ok(getInterestSuggestions("ai").includes("AI Ethics & Policy"));
  assert.ok(getInterestSuggestions("health").includes("Healthcare & MedTech"));
});

test("only suggests matches and excludes areas that are already selected", () => {
  const suggestions = getInterestSuggestions("health", ["Cybersecurity", "Creative & Design"]);

  assert.ok(suggestions.includes("Healthcare & MedTech"));
  assert.ok(!suggestions.includes("Cybersecurity"));
  assert.ok(!suggestions.includes("Creative & Design"));
  assert.deepEqual(getInterestSuggestions("", []), []);
});
