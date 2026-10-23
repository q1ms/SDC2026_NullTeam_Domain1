import { setTimeout as delay } from "node:timers/promises";

type RunpodOptions = {
  endpointId: string;
  apiKey: string;
  input: Record<string, unknown>;
};

type RunpodDependencies = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractRunpodText(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return extractRunpodText(output[0]);
  if (isRecord(output)) {
    if ("scenarios" in output) return JSON.stringify(output);
    for (const key of ["text", "generated_text", "response", "content"]) {
      if (typeof output[key] === "string" || Array.isArray(output[key])) {
        return extractRunpodText(output[key]);
      }
    }
    if (Array.isArray(output.choices) && isRecord(output.choices[0])) {
      const choice = output.choices[0];
      if (typeof choice.text === "string") return choice.text;
      if (isRecord(choice.message)) return extractRunpodText(choice.message.content);
    }
    if ("output" in output) return extractRunpodText(output.output);
  }
  throw new Error("RunPod did not return generated text.");
}

export function parseRunpodJson(
  output: unknown,
  onParseFailure?: (preview: string) => void,
  redactValues: readonly string[] = [],
): Record<string, unknown> {
  const rawText = extractRunpodText(output);
  let parsed: unknown;
  try {
    const start = rawText.search(/[{\[]/);
    const end = Math.max(rawText.lastIndexOf("}"), rawText.lastIndexOf("]"));
    if (start < 0 || end < start) {
      throw new Error("Generated text did not contain a complete JSON object or array.");
    }
    const jsonString = rawText.substring(start, end + 1);
    parsed = JSON.parse(jsonString);
  } catch (error) {
    let safeText = rawText;
    for (const value of redactValues) {
      if (value) safeText = safeText.replaceAll(value, "[REDACTED]");
    }
    onParseFailure?.(safeText.substring(0, 200));
    throw error;
  }

  if (Array.isArray(parsed)) {
    parsed = { scenarios: parsed };
  }
  if (!isRecord(parsed) || Object.keys(parsed).length !== 1 || !("scenarios" in parsed)) {
    throw new Error("Generated JSON must contain only a scenarios property.");
  }
  return parsed;
}

/** Start one async job, then wait for a terminal state without resubmitting it. */
export async function runPathwayJob(
  options: RunpodOptions,
  dependencies: RunpodDependencies = {},
): Promise<Record<string, unknown>> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep = dependencies.sleep
    ?? ((milliseconds, signal) => delay(milliseconds, undefined, { signal }));
  const signal = AbortSignal.timeout(dependencies.timeoutMs ?? 300_000);
  const baseUrl = `https://api.runpod.ai/v2/${encodeURIComponent(options.endpointId)}`;
  const request = async (path: string, init: RequestInit) => {
    signal.throwIfAborted();
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        Accept: "application/json",
        ...(init.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      signal,
    });
    if (!response.ok) throw new Error(`RunPod request failed with HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!isRecord(data)) throw new Error("RunPod returned an invalid job envelope.");
    return data;
  };

  try {
    let data = await request("/run", {
      method: "POST",
      body: JSON.stringify({ input: options.input }),
    });
    if (typeof data.id !== "string" || !data.id) {
      throw new Error("RunPod did not return a job ID.");
    }
    const jobId = data.id;
    while (data.status !== "COMPLETED") {
      if (data.status === "TIMED_OUT") {
        throw new DOMException("RunPod job timed out.", "TimeoutError");
      }
      if (data.status === "FAILED" || data.status === "CANCELLED") {
        throw new Error("RunPod job failed or was cancelled.");
      }
      if (data.status !== "IN_QUEUE" && data.status !== "IN_PROGRESS") {
        throw new Error("RunPod returned an unknown job status.");
      }
      await sleep(3000, signal);
      data = await request(`/status/${encodeURIComponent(jobId)}`, { method: "GET" });
    }
    return data;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error;
  }
}
