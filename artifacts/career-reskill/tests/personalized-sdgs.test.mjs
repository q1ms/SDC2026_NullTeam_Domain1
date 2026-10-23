import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getPersonalizedSdgNumbers,
  prioritizeSdgMappings,
} from "../src/lib/personalized-sdgs.ts";

test("extracts valid unique SDG numbers from generated scenario tags", () => {
  assert.deepEqual(
    [...getPersonalizedSdgNumbers([
      "SDG 8: Decent Work and Economic Growth",
      "SDG 4: Quality Education",
      "SDG 8: Decent Work and Economic Growth",
      "UN goal 12",
      "SDG 0: Invalid",
      "SDG 18: Invalid",
    ])],
    [8, 4],
  );
});

test("prioritizes matched goals while preserving number order within groups", () => {
  const goals = [17, 2, 4, 8, 1].map((number) => ({ number, title: `Goal ${number}` }));
  const prioritized = prioritizeSdgMappings(goals, new Set([8, 2]));

  assert.deepEqual(prioritized.map((goal) => goal.number), [2, 8, 1, 4, 17]);
  assert.deepEqual(goals.map((goal) => goal.number), [17, 2, 4, 8, 1]);
});
