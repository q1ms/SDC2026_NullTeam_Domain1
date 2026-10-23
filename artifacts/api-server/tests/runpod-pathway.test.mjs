import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRunpodJson, runPathwayJob } from "../src/lib/runpod-pathway.ts";

const json = '{"scenarios":[]}';
const wrapped = `Here are your career paths:\n\`\`\`json\n${json}\n\`\`\`\nHope this helps.`;

test("extracts first-to-last braces from all supported text envelopes", () => {
  for (const output of [
    { text: [wrapped] },
    [wrapped],
    wrapped,
    [{ text: [wrapped] }],
    [{ choices: [{ message: { content: wrapped } }] }],
    { scenarios: [] },
  ]) {
    assert.deepEqual(parseRunpodJson(output), { scenarios: [] });
  }
});

test("parsing failure reports only the first 200 characters", () => {
  const raw = `No JSON was generated. ${"x".repeat(300)}`;
  let preview;
  assert.throws(() => parseRunpodJson(raw, (value) => { preview = value; }));
  assert.equal(preview, raw.substring(0, 200));
  assert.equal(preview.length, 200);
});

test("malformed and incomplete JSON fail rather than inventing scenarios", () => {
  for (const raw of ['{"scenarios": [}', '{"scenarios": [', '{"other":[]}']) {
    assert.throws(() => parseRunpodJson(raw));
  }
});

test("redacts configured credentials before truncating a diagnostic preview", () => {
  const raw = `${"x".repeat(190)}SENSITIVE_TEST_VALUE${"x".repeat(100)}`;
  let preview;
  assert.throws(() => parseRunpodJson(raw, (value) => { preview = value; }, ["SENSITIVE_TEST_VALUE"]));
  assert.equal(preview, `${"x".repeat(190)}[REDACTED]`);
  assert.equal(preview.length, 200);
});

test("starts one /run job and polls every 3 seconds until completed", async () => {
  const requests = [];
  const intervals = [];
  const responses = [
    { id: "test-job", status: "IN_QUEUE" },
    { id: "test-job", status: "IN_PROGRESS" },
    { id: "test-job", status: "COMPLETED", output: { text: [wrapped] } },
  ];
  const input = { prompt: "Test prompt", sampling_params: { max_tokens: 2500, temperature: 0.7 } };
  const result = await runPathwayJob(
    { endpointId: "test-endpoint", apiKey: "test-key", input },
    {
      fetchImpl: async (url, init) => {
        requests.push({ url, ...init });
        return Response.json(responses.shift());
      },
      sleep: async (ms) => { intervals.push(ms); },
    },
  );
  assert.equal(requests.length, 3);
  assert.equal(requests[0].url, "https://api.runpod.ai/v2/test-endpoint/run");
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(JSON.parse(requests[0].body), { input });
  for (const request of requests.slice(1)) {
    assert.equal(request.url, "https://api.runpod.ai/v2/test-endpoint/status/test-job");
    assert.equal(request.method, "GET");
    assert.equal(request.headers.Authorization, "Bearer test-key");
  }
  assert.deepEqual(intervals, [3000, 3000]);
  assert.deepEqual(parseRunpodJson(result.output), { scenarios: [] });
});

test("stops on terminal failures and rejects missing IDs or HTTP errors", async () => {
  for (const status of ["FAILED", "CANCELLED", "TIMED_OUT"]) {
    await assert.rejects(runPathwayJob(
      { endpointId: "test-endpoint", apiKey: "test-key", input: {} },
      { fetchImpl: async () => Response.json({ id: "test-job", status }) },
    ));
  }
  await assert.rejects(runPathwayJob(
    { endpointId: "test-endpoint", apiKey: "test-key", input: {} },
    { fetchImpl: async () => Response.json({ status: "IN_QUEUE" }) },
  ), /job ID/);
  await assert.rejects(runPathwayJob(
    { endpointId: "test-endpoint", apiKey: "test-key", input: {} },
    { fetchImpl: async () => new Response(null, { status: 503 }) },
  ), /HTTP 503/);
});

test("the overall deadline bounds polling instead of waiting forever", async () => {
  await assert.rejects(runPathwayJob(
    { endpointId: "test-endpoint", apiKey: "test-key", input: {} },
    {
      timeoutMs: 5,
      fetchImpl: async () => Response.json({ id: "test-job", status: "IN_QUEUE" }),
      sleep: async () => { await new Promise((resolve) => setTimeout(resolve, 20)); },
    },
  ), { name: "TimeoutError" });
});
