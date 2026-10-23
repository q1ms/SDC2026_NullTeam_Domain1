import assert from "node:assert/strict";
import { test } from "node:test";
import { INTEREST_OPTIONS } from "../src/data/catalog.ts";

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
