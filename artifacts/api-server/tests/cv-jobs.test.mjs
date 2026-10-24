import assert from "node:assert/strict";
import { test } from "node:test";
import { getCvParseJob, startCvParseJob } from "../src/lib/cv-jobs.ts";

const fields = {
  displayName: "Amina Example",
  location: "Kuala Lumpur",
  headline: "Product manager",
  targetIndustry: "Technology",
  currentRole: "Product manager",
  industry: "Technology",
  yearsOfExperience: 5,
  skills: ["Planning"],
};

test("CV jobs expose processing then completed state without keeping a request open", async () => {
  let finish;
  const jobId = startCvParseJob(() => new Promise((resolve) => { finish = resolve; }));
  assert.deepEqual(getCvParseJob(jobId), { status: "processing" });

  await Promise.resolve();
  finish(fields);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(getCvParseJob(jobId), { status: "completed", fields });
});

test("CV job failures are logged through the callback and return a safe status", async () => {
  let loggedError;
  const jobId = startCvParseJob(
    async () => { throw new Error("Model response contained private résumé text."); },
    (error) => { loggedError = error; },
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(loggedError.message, /private résumé text/);
  assert.deepEqual(getCvParseJob(jobId), {
    status: "failed",
    error: "We couldn’t analyze this résumé. Please try again or enter your details manually.",
  });
});
