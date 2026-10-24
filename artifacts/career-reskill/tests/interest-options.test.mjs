import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addInterestSelection,
  getInterestSuggestions,
  getInterestEntryOptions,
  INTEREST_OPTIONS,
  toggleInterestSelection,
} from "../src/data/catalog.ts";
import {
  GeneratePathwayBody,
  SaveCareerProfileBody,
} from "../../../lib/api-zod/src/generated/api.ts";

test("custom interests can be added, removed, and submitted without an allowlist", () => {
  assert.deepEqual(getInterestEntryOptions("  goon  "), ["goon"]);
  assert.ok(getInterestEntryOptions("tech").includes("tech"));
  assert.ok(getInterestEntryOptions("tech").includes("AI & automation"));
  assert.deepEqual(getInterestEntryOptions("   "), []);
  assert.ok(!getInterestEntryOptions(" edtech ").includes("edtech"));
  assert.deepEqual(getInterestEntryOptions("GOON", ["goon"]), []);
  const interests = addInterestSelection(["EdTech"], "  goon  ");
  assert.deepEqual(interests, ["EdTech", "goon"]);
  assert.deepEqual(addInterestSelection(interests, "GOON"), interests);
  assert.deepEqual(addInterestSelection(interests, " "), interests);
  assert.deepEqual(toggleInterestSelection(interests, "goon"), ["EdTech"]);
  const multilingual = addInterestSelection(interests, "Seni & budaya");
  const profile = { currentRole: "Student", industry: "Education", yearsExperience: 0,
    skills: ["Communication"], weeklyHours: 4, interests: multilingual };
  assert.deepEqual(SaveCareerProfileBody.parse(profile).interests, multilingual);
  assert.deepEqual(GeneratePathwayBody.parse({
    profileId: "00000000-0000-4000-8000-000000000001", profile,
  }).profile.interests, multilingual);
});

test("includes the requested cross-sector career areas without duplicates", () => {
  const requested = [
    "Healthcare & MedTech",
    "Creative & Design",
    "FinTech & Blockchain",
    "Smart Cities & IoT",
    "Supply Chain & Logistics",
    "AI Ethics & Policy",
    "Education & Teaching",
    "EdTech",
    "Instructional Design",
    "Special Education",
    "Corporate Training",
    "Higher Education Administration",
    "Food & Beverage",
    "Hospitality Management",
    "Culinary Arts",
    "Hotel Operations",
    "Event Planning",
    "Tourism Management",
    "Business Strategy",
    "Project Management",
    "Human Resources",
    "Financial Analysis",
    "Operations Management",
    "Public Relations",
    "Content Creation",
    "Digital Marketing",
    "Graphic Design",
    "Journalism",
    "Video Production",
    "UI/UX Design",
    "Architecture",
    "Nursing",
    "Healthcare Administration",
    "Social Work",
    "Public Health",
    "Psychology & Counseling",
    "Biomedical Research",
    "Agricultural Technology",
    "Renewable Energy",
    "Environmental Policy",
    "Urban Planning",
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

test("matches partial keywords across education, food, health, business, and creative areas", () => {
  const expectedMatches = {
    edu: [
      "Education & Teaching",
      "EdTech",
      "Instructional Design",
      "Special Education",
      "Corporate Training",
      "Higher Education Administration",
    ],
    food: [
      "Food & Beverage",
      "Hospitality Management",
      "Culinary Arts",
      "Hotel Operations",
      "Event Planning",
      "Tourism Management",
    ],
    health: [
      "Nursing",
      "Healthcare Administration",
      "Social Work",
      "Public Health",
      "Psychology & Counseling",
      "Biomedical Research",
    ],
    bus: [
      "Business Strategy",
      "Project Management",
      "Human Resources",
      "Supply Chain & Logistics",
      "Financial Analysis",
      "Operations Management",
      "Public Relations",
    ],
    art: [
      "Content Creation",
      "Digital Marketing",
      "Graphic Design",
      "Journalism",
      "Video Production",
      "UI/UX Design",
      "Architecture",
    ],
  };

  for (const [query, expected] of Object.entries(expectedMatches)) {
    const suggestions = getInterestSuggestions(query);
    for (const option of expected) {
      assert.ok(suggestions.includes(option), `Searching "${query}" should include ${option}`);
    }
  }
});

test("only suggests matches and excludes areas that are already selected", () => {
  const suggestions = getInterestSuggestions("health", ["Cybersecurity", "Creative & Design"]);

  assert.ok(suggestions.includes("Healthcare & MedTech"));
  assert.ok(!suggestions.includes("Cybersecurity"));
  assert.ok(!suggestions.includes("Creative & Design"));
  assert.deepEqual(getInterestSuggestions("", []), []);
});

test("multiple selected tags remain intact and pass the profile API schemas", () => {
  const selected = INTEREST_OPTIONS.slice(0, 6).reduce(
    (current, interest) => addInterestSelection(current, interest),
    [],
  );
  const nextSelection = addInterestSelection(selected, "Education & Teaching");

  assert.deepEqual(nextSelection, [...selected, "Education & Teaching"]);
  assert.deepEqual(
    toggleInterestSelection(nextSelection, "EdTech"),
    [...nextSelection, "EdTech"],
  );
  assert.deepEqual(
    toggleInterestSelection(nextSelection, "Education & Teaching"),
    selected,
  );

  const profile = {
    currentRole: "Career switcher",
    yearsExperience: 5,
    industry: "Education",
    skills: ["Communication"],
    interests: nextSelection,
    weeklyHours: 4,
  };
  const profileId = "00000000-0000-4000-8000-000000000001";

  assert.deepEqual(SaveCareerProfileBody.parse(profile).interests, nextSelection);
  const requestPayload = JSON.parse(JSON.stringify({ profileId, profile }));
  assert.deepEqual(
    GeneratePathwayBody.parse(requestPayload).profile.interests,
    nextSelection,
  );
});
