import { randomUUID } from "node:crypto";
import type { ParsedCvFields } from "./cv-parser";

export type CvParseJobSnapshot =
  | { status: "processing" }
  | { status: "completed"; fields: ParsedCvFields }
  | { status: "failed"; error: string };

type CvParseJobRecord = CvParseJobSnapshot & { expiresAt: number };

const JOB_TTL_MS = 10 * 60 * 1000;
const JOB_FAILURE_MESSAGE = "We couldn’t analyze this résumé. Please try again or enter your details manually.";
const jobs = new Map<string, CvParseJobRecord>();

function removeExpiredJobs(now: number): void {
  for (const [jobId, job] of jobs) {
    if (job.expiresAt <= now) jobs.delete(jobId);
  }
}

export function startCvParseJob(
  task: () => Promise<ParsedCvFields>,
  onFailure?: (error: unknown) => void,
): string {
  const now = Date.now();
  removeExpiredJobs(now);
  const jobId = randomUUID();
  jobs.set(jobId, { status: "processing", expiresAt: now + JOB_TTL_MS });

  void Promise.resolve()
    .then(task)
    .then((fields) => {
      if (jobs.has(jobId)) {
        jobs.set(jobId, { status: "completed", fields, expiresAt: Date.now() + JOB_TTL_MS });
      }
    })
    .catch((error: unknown) => {
      try {
        onFailure?.(error);
      } catch {
        // Logging failures must not leave the job pending forever.
      }
      if (jobs.has(jobId)) {
        jobs.set(jobId, { status: "failed", error: JOB_FAILURE_MESSAGE, expiresAt: Date.now() + JOB_TTL_MS });
      }
    });

  return jobId;
}

export function getCvParseJob(jobId: string): CvParseJobSnapshot | undefined {
  removeExpiredJobs(Date.now());
  const job = jobs.get(jobId);
  if (!job) return undefined;

  if (job.status === "processing") return { status: "processing" };
  if (job.status === "completed") return { status: "completed", fields: job.fields };
  return { status: "failed", error: job.error };
}
