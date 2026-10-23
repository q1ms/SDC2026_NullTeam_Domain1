import assert from "node:assert/strict";
import { test } from "node:test";
import { filterInterestOptions, INTEREST_OPTIONS } from "../src/data/catalog.ts";

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
  const technologyMatches = filterInterestOptions("tech");
  assert.ok(technologyMatches.includes("AI & automation"));
  assert.ok(technologyMatches.includes("Cybersecurity"));
  assert.ok(filterInterestOptions("ai").includes("AI Ethics & Policy"));
  assert.ok(filterInterestOptions("health").includes("Healthcare & MedTech"));
});

test("keeps selected areas visible when they do not match the active search", () => {
  const visible = filterInterestOptions("health", ["Cybersecurity", "Creative & Design"]);

  assert.ok(visible.includes("Healthcare & MedTech"));
  assert.ok(visible.includes("Cybersecurity"));
  assert.ok(visible.includes("Creative & Design"));
  assert.equal(filterInterestOptions("", []).length, INTEREST_OPTIONS.length);
});
